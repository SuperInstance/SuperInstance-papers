import { NextRequest, NextResponse } from 'next/server';
import { ChannelDepth } from '@/lib/polln';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params, n_visits, time_span } = body;

    const cd = new ChannelDepth(params);

    switch (action) {
      case 'compute': {
        // Compute current depth and cost
        const visits = body.visits || [];
        const currentTime = body.currentTime || visits.length;
        
        for (const visit of visits) {
          cd.recordVisit(visit.timestamp || visit, visit.intensity || 1.0);
        }
        
        return NextResponse.json({
          success: true,
          action: 'compute',
          depth: cd.computeDepth(currentTime),
          cost: cd.computeCognitiveCost(currentTime),
          cost_reduction: cd.getCostReduction(currentTime),
          visit_count: cd.visitCount,
          params: cd.getParams()
        });
      }

      case 'learning_curve': {
        // Simulate learning over time
        const numVisits = n_visits || 20;
        const span = time_span || 10.0;
        
        const learning = cd.simulateLearning(numVisits, span);
        
        return NextResponse.json({
          success: true,
          action: 'learning_curve',
          n_visits: numVisits,
          times: learning.times,
          depths: learning.depths,
          costs: learning.costs,
          final_depth: learning.depths[learning.depths.length - 1],
          final_cost: learning.costs[learning.costs.length - 1],
          cost_reduction: ((1 - learning.costs[learning.costs.length - 1]) * 100).toFixed(1) + '%',
          insight: 'Repeated visits exponentially reduce cognitive cost'
        });
      }

      case 'mastery_pattern': {
        // Simulate mastery pattern (water metaphor)
        const visitCounts = [1, 5, 10, 20, 50, 100];
        const results = [];
        
        for (const n of visitCounts) {
          const cdSim = new ChannelDepth({ 
            lambda: 0.05, 
            alpha: 0.3, 
            baseCost: 10.0 
          });
          cdSim.simulateLearning(n, n);
          const finalCost = cdSim.computeCognitiveCost(n);
          const costReduction = 1 - (finalCost / 10.0);
          
          results.push({
            n_visits: n,
            final_cost: finalCost.toFixed(4),
            cost_reduction_pct: (costReduction * 100).toFixed(1)
          });
        }
        
        return NextResponse.json({
          success: true,
          action: 'mastery_pattern',
          concept: 'Water carves channels → thoughts find ocean with NO WORK',
          results: results,
          formulas: [
            'Depth(s) = ∫₀^t visits(τ) × e^(-λ(t-τ)) dτ',
            'Cost(s) = Base × e^(-α × Depth(s))'
          ]
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: compute, learning_curve, or mastery_pattern'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    module: 'Channel Depth',
    description: 'Mastery through channel carving - water metaphor',
    actions: [
      {
        action: 'compute',
        description: 'Compute current depth and cognitive cost',
        parameters: ['visits', 'currentTime', 'params']
      },
      {
        action: 'learning_curve',
        description: 'Simulate learning over time',
        parameters: ['n_visits', 'time_span', 'params']
      },
      {
        action: 'mastery_pattern',
        description: 'Simulate mastery pattern (water metaphor)',
        parameters: []
      }
    ],
    formulas: [
      'Depth(s) = ∫₀^t visits(τ) × e^(-λ(t-τ)) dτ',
      'Cost(s) = Base × e^(-α × Depth(s))',
      'Mastery = 1 - (Cost / Base)'
    ],
    insight: 'Channels carved → thoughts find ocean with NO WORK'
  });
}
