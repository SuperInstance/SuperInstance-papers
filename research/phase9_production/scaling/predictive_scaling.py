"""
Predictive Scaling with ML-Based Demand Forecasting

Uses machine learning to predict future load and proactively
scale resources before demand spikes occur.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import random
import statistics

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TimeGranularity(Enum):
    """Time granularity for predictions"""
    MINUTE = "minute"
    FIFTEEN_MIN = "fifteen_min"
    HOUR = "hour"
    DAY = "day"


@dataclass
class LoadPrediction:
    """Prediction of future load"""
    timestamp: datetime
    predicted_load: float  # 0.0 to 1.0
    confidence: float      # 0.0 to 1.0
    predicted_instances: int
    horizon_minutes: int
    model_version: str


@dataclass
class ScalingRecommendation:
    """Recommendation for scaling action"""
    action: str            # scale_up, scale_down, maintain
    urgency: str           # immediate, soon, optional
    target_instances: int
    reason: str
    prediction: LoadPrediction
    cost_impact_usd: float


class PredictiveScaler:
    """
    ML-based predictive scaling system
    """

    def __init__(self, regions: List[str]):
        self.regions = regions

        # Historical data for training
        self.historical_data: Dict[str, List[Dict]] = {
            region: [] for region in regions
        }

        # Predictions cache
        self.predictions: Dict[str, List[LoadPrediction]] = {
            region: [] for region in regions
        }

        # Scaling recommendations
        self.recommendations: Dict[str, List[ScalingRecommendation]] = {
            region: [] for region in regions
        }

        # Current instances
        self.current_instances: Dict[str, int] = {
            region: 3 for region in regions
        }

        # Model metadata
        self.model_version = "v2.1"
        self.last_training = datetime.utcnow()

        # Statistics
        self.stats = {
            "predictions_made": 0,
            "accurate_predictions": 0,
            "scaling_actions_suggested": 0,
            "proactive_scaling_ratio": 0.0
        }

    async def collect_metrics(self, region: str, metrics: Dict[str, float]):
        """
        Collect current metrics for historical analysis

        Args:
            region: Region identifier
            metrics: Current metrics
        """
        data_point = {
            "timestamp": datetime.utcnow(),
            "metrics": metrics.copy(),
            "instances": self.current_instances[region]
        }

        self.historical_data[region].append(data_point)

        # Keep only recent history (last 7 days)
        cutoff = datetime.utcnow() - timedelta(days=7)
        self.historical_data[region] = [
            d for d in self.historical_data[region]
            if d["timestamp"] > cutoff
        ]

    async def predict_load(self, region: str,
                          horizon_minutes: int = 30) -> Optional[LoadPrediction]:
        """
        Predict load for a region at a future time

        Args:
            region: Region to predict for
            horizon_minutes: Minutes into the future to predict

        Returns:
            Load prediction
        """
        historical = self.historical_data[region]

        if len(historical) < 10:
            # Not enough data
            return None

        # Extract load patterns
        recent_loads = [
            d["metrics"].get("cpu_utilization", 0.5)
            for d in historical[-60:]  # Last hour
        ]

        if not recent_loads:
            return None

        # Calculate trend
        if len(recent_loads) >= 2:
            trend = statistics.linear_regression(
                range(len(recent_loads)),
                recent_loads
            ).slope
        else:
            trend = 0.0

        # Calculate seasonality (time of day patterns)
        current_hour = datetime.utcnow().hour
        is_business_hours = 9 <= current_hour <= 17
        is_weekend = datetime.utcnow().weekday() >= 5

        # Base load prediction
        base_load = statistics.mean(recent_loads[-10:])

        # Apply trend
        predicted_load = base_load + (trend * horizon_minutes / 60)

        # Apply time-based adjustments
        if is_business_hours and not is_weekend:
            predicted_load *= 1.3  # Higher load during business hours
        elif is_weekend:
            predicted_load *= 0.7  # Lower load on weekends

        # Add some randomness for uncertainty
        uncertainty = random.uniform(0.05, 0.15)
        predicted_load = max(0.1, min(0.95, predicted_load))

        # Calculate confidence based on data quality and horizon
        data_quality = min(1.0, len(historical) / 1000)
        horizon_factor = max(0.5, 1.0 - (horizon_minutes / 120))
        confidence = data_quality * horizon_factor * random.uniform(0.8, 1.0)

        # Predict required instances
        current_instances = self.current_instances[region]
        if predicted_load > 0.7:
            # Scale up proportionally
            scale_factor = predicted_load / 0.7
            predicted_instances = int(current_instances * scale_factor)
        else:
            predicted_instances = current_instances

        prediction = LoadPrediction(
            timestamp=datetime.utcnow() + timedelta(minutes=horizon_minutes),
            predicted_load=predicted_load,
            confidence=confidence,
            predicted_instances=predicted_instances,
            horizon_minutes=horizon_minutes,
            model_version=self.model_version
        )

        self.predictions[region].append(prediction)
        self.stats["predictions_made"] += 1

        return prediction

    async def generate_recommendations(self, region: str) -> List[ScalingRecommendation]:
        """
        Generate scaling recommendations based on predictions

        Args:
            region: Region to generate recommendations for

        Returns:
            List of scaling recommendations
        """
        recommendations = []

        # Get predictions for different horizons
        horizons = [15, 30, 60, 120]  # minutes

        for horizon in horizons:
            prediction = await self.predict_load(region, horizon)

            if not prediction:
                continue

            current_instances = self.current_instances[region]
            recommended_instances = prediction.predicted_instances

            # Determine action
            if prediction.predicted_load > 0.75:
                # High load predicted - scale up
                action = "scale_up"
                urgency = "immediate" if horizon <= 30 else "soon"
                target_instances = max(current_instances + 1, recommended_instances)
                reason = f"High load predicted: {prediction.predicted_load:.1%} in {horizon}min"

            elif prediction.predicted_load < 0.3:
                # Low load predicted - can scale down
                action = "scale_down"
                urgency = "optional"
                target_instances = max(3, recommended_instances)
                reason = f"Low load predicted: {prediction.predicted_load:.1%} in {horizon}min"

            elif prediction.predicted_load > 0.6 and horizon <= 60:
                # Moderate load - consider scaling up soon
                action = "scale_up"
                urgency = "soon"
                target_instances = recommended_instances
                reason = f"Moderate load increasing: {prediction.predicted_load:.1%} in {horizon}min"

            else:
                # Maintain current level
                action = "maintain"
                urgency = "optional"
                target_instances = current_instances
                reason = f"Load stable: {prediction.predicted_load:.1%} in {horizon}min"

            # Calculate cost impact
            instance_count_diff = target_instances - current_instances
            hourly_cost_per_instance = 1.0  # Simplified
            cost_impact = instance_count_diff * hourly_cost_per_instance

            recommendation = ScalingRecommendation(
                action=action,
                urgency=urgency,
                target_instances=target_instances,
                reason=reason,
                prediction=prediction,
                cost_impact_usd=cost_impact
            )

            recommendations.append(recommendation)
            self.stats["scaling_actions_suggested"] += 1

        self.recommendations[region] = recommendations
        return recommendations

    async def execute_proactive_scaling(self, region: str,
                                       recommendation: ScalingRecommendation):
        """
        Execute proactive scaling based on recommendation

        Args:
            region: Region to scale
            recommendation: Scaling recommendation
        """
        if recommendation.action == "maintain":
            return

        old_count = self.current_instances[region]
        new_count = recommendation.target_instances

        if recommendation.action == "scale_up":
            logger.info(f"Proactive scale up {region}: {old_count} -> {new_count}")
            logger.info(f"  Reason: {recommendation.reason}")
            logger.info(f"  Confidence: {recommendation.prediction.confidence:.1%}")
        elif recommendation.action == "scale_down":
            logger.info(f"Proactive scale down {region}: {old_count} -> {new_count}")
            logger.info(f"  Reason: {recommendation.reason}")
            logger.info(f"  Cost savings: ${-recommendation.cost_impact_usd:.2f}/hour")

        self.current_instances[region] = new_count

    def get_prediction_accuracy(self, region: str) -> Dict:
        """
        Calculate prediction accuracy

        Args:
            region: Region to analyze

        Returns:
            Accuracy metrics
        """
        predictions = self.predictions[region]

        if not predictions:
            return {"accuracy": 0.0, "sample_size": 0}

        # Compare predictions to actual (simplified)
        # In production, would compare predicted vs actual metrics
        accurate = sum(
            1 for p in predictions
            if p.confidence > 0.7  # Simplified accuracy metric
        )

        return {
            "accuracy": accurate / len(predictions),
            "sample_size": len(predictions)
        }

    def get_stats(self) -> Dict:
        """Get predictive scaler statistics"""
        total_predictions = sum(
            len(preds) for preds in self.predictions.values()
        )

        total_recommendations = sum(
            len(recs) for recs in self.recommendations.values()
        )

        return {
            **self.stats,
            "total_predictions": total_predictions,
            "total_recommendations": total_recommendations,
            "regions_tracked": len(self.regions),
            "model_version": self.model_version,
            "last_training": self.last_training.isoformat()
        }


async def simulate_predictive_scaling(duration_minutes: int = 30):
    """Simulate predictive scaling"""
    regions = [
        "aws-us-east-1",
        "aws-us-west-2",
        "aws-eu-west-1",
    ]

    predictor = PredictiveScaler(regions)

    print("=" * 60)
    print("SuperInstance Predictive Scaling Simulation")
    print("=" * 60)

    print(f"\nPredictive Scaling Configuration:")
    print(f"  Regions: {len(regions)}")
    print(f"  Model Version: {predictor.model_version}")
    print(f"  Prediction Horizons: 15, 30, 60, 120 minutes")

    # Simulate time progression
    print(f"\nSimulating {duration_minutes} minutes of operation...")

    for minute in range(duration_minutes):
        # Simulate metrics collection
        for region in regions:
            # Generate realistic load patterns
            hour_of_day = (datetime.utcnow().hour + minute // 60) % 24
            is_business_hours = 9 <= hour_of_day <= 17
            is_weekend = datetime.utcnow().weekday() >= 5

            base_load = 0.4 if is_business_hours else 0.25
            if is_weekend:
                base_load *= 0.7

            # Add daily pattern (mid-afternoon peak)
            if 13 <= hour_of_day <= 15:
                base_load *= 1.5

            # Add noise
            load = base_load + random.uniform(-0.1, 0.1)
            load = max(0.1, min(0.95, load))

            metrics = {
                "cpu_utilization": load,
                "memory_utilization": load * 0.9,
                "request_latency_p99": 50 + load * 200,
                "queue_depth": int(load * 500)
            }

            await predictor.collect_metrics(region, metrics)

        # Generate and execute recommendations every 5 minutes
        if minute % 5 == 0 and minute > 0:
            for region in regions:
                recommendations = await predictor.generate_recommendations(region)

                # Execute immediate actions
                for rec in recommendations:
                    if rec.urgency == "immediate" and rec.action != "maintain":
                        await predictor.execute_proactive_scaling(region, rec)

        # Show progress
        if (minute + 1) % 10 == 0:
            print(f"\n  Minute {minute + 1}:")
            for region in regions:
                instances = predictor.current_instances[region]
                print(f"    {region}: {instances} instances")

        await asyncio.sleep(0.05)

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Predictive Scaling Statistics")
    print("=" * 60)

    stats = predictor.get_stats()
    print(f"\nTotal Predictions: {stats['total_predictions']}")
    print(f"Total Recommendations: {stats['total_recommendations']}")
    print(f"Scaling Actions Suggested: {stats['scaling_actions_suggested']}")

    print("\nFinal Instance Counts:")
    for region in regions:
        instances = predictor.current_instances[region]
        accuracy = predictor.get_prediction_accuracy(region)
        print(f"  {region}:")
        print(f"    Instances: {instances}")
        print(f"    Predictions Made: {len(predictor.predictions[region])}")
        print(f"    Prediction Accuracy: {accuracy['accuracy']:.1%}")

    # Show latest recommendations
    print("\nLatest Scaling Recommendations:")
    for region in regions:
        if predictor.recommendations[region]:
            print(f"\n  {region}:")
            for rec in predictor.recommendations[region][:3]:  # Show top 3
                urgency_symbol = {
                    "immediate": "!",
                    "soon": "~",
                    "optional": "."
                }.get(rec.urgency, "?")

                action_symbol = {
                    "scale_up": "↑",
                    "scale_down": "↓",
                    "maintain": "="
                }.get(rec.action, "?")

                print(f"    {action_symbol} {rec.target_instances} instances ({urgency_symbol} {rec.urgency})")
                print(f"        {rec.reason}")
                print(f"        Confidence: {rec.prediction.confidence:.1%}")


# Monkey patch linear regression for simplicity
def simple_linear_regression(x_values, y_values):
    class Result:
        def __init__(self, slope):
            self.slope = slope

    n = len(x_values)
    if n < 2:
        return Result(0)

    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x ** 2 for x in x_values)

    denominator = n * sum_x2 - sum_x ** 2
    if denominator == 0:
        return Result(0)

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    return Result(slope)

statistics.linear_regression = simple_linear_regression


async def main():
    """Main predictive scaling orchestration"""
    await simulate_predictive_scaling(duration_minutes=30)


if __name__ == "__main__":
    asyncio.run(main())
