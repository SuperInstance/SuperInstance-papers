# ============================================================================
# JULIA BAYESIAN CERTAINTY TILES
# Cycle 2-B: Extract TILES from Bayesian probability for certainty
# ============================================================================

using Distributions
using Statistics
using LinearAlgebra

# ============================================================================
# TILE 1: BAYES_RULE
# ============================================================================
"""
TILE: BAYES_RULE
MATH: P(H|E) = P(E|H) × P(H) / P(E)
JULIA: Compute posterior probability using Bayes' theorem
USES: HIGH - Fundamental Bayesian updating
"""

function bayes_rule(prior::Real, likelihood::Real, evidence::Real)
    """
    Compute posterior probability using Bayes' theorem.
    
    Arguments:
        prior: P(H) - prior probability of hypothesis
        likelihood: P(E|H) - probability of evidence given hypothesis
        evidence: P(E) - marginal probability of evidence
    
    Returns:
        posterior: P(H|E) - updated probability after observing evidence
    """
    @assert 0 ≤ prior ≤ 1 "Prior must be in [0,1]"
    @assert 0 ≤ likelihood ≤ 1 "Likelihood must be in [0,1]"
    @assert 0 < evidence ≤ 1 "Evidence must be in (0,1]"
    
    posterior = (likelihood * prior) / evidence
    return clamp(posterior, 0.0, 1.0)
end

# ============================================================================
# TILE 2: POSTERIOR_UPDATE_CHAIN
# ============================================================================
"""
TILE: POSTERIOR_UPDATE_CHAIN
MATH: P(H|E₁,...,Eₙ) ∝ P(H) × ∏ᵢ P(Eᵢ|H)
JULIA: Sequential posterior updates with multiple evidence
USES: HIGH - Multi-evidence certainty accumulation
"""

function posterior_update_chain(prior::Real, likelihoods::AbstractVector{<:Real})
    """
    Sequentially update posterior with multiple evidence observations.
    
    Arguments:
        prior: Initial P(H)
        likelihoods: Vector of P(Eᵢ|H) for each evidence
    
    Returns:
        posterior: Updated certainty after all evidence
    """
    posterior = prior
    log_posterior = log(posterior)
    
    for likelihood in likelihoods
        # Incremental update: P(H|E₁,...,Eₙ) ∝ P(H|E₁,...,Eₙ₋₁) × P(Eₙ|H)
        log_posterior += log(likelihood)
    end
    
    # Normalize (assuming uniform marginal)
    # For proper normalization, we'd need P(¬H) × P(E|¬H) terms
    posterior = exp(log_posterior)
    return clamp(posterior, 0.0, 1.0)
end

function posterior_update_normalized(
    prior::Real, 
    likelihoods_given_h::AbstractVector{<:Real},
    likelihoods_given_not_h::AbstractVector{<:Real}
)
    """
    Normalized posterior update with proper marginal evidence calculation.
    """
    prior_not = 1.0 - prior
    
    # P(H|E₁,...,Eₙ) = P(H)∏P(Eᵢ|H) / [P(H)∏P(Eᵢ|H) + P(¬H)∏P(Eᵢ|¬H)]
    numerator = prior * prod(likelihoods_given_h)
    denominator = numerator + prior_not * prod(likelihoods_given_not_h)
    
    return denominator > 0 ? numerator / denominator : 0.5
end

# ============================================================================
# TILE 3: BETA_PRIOR_CERTAINTY
# ============================================================================
"""
TILE: BETA_PRIOR_CERTAINTY
MATH: Beta(α,β): f(x) = x^(α-1)(1-x)^(β-1) / B(α,β)
JULIA: Beta distribution for modeling certainty in [0,1]
USES: HIGH - Prior/posterior for binary certainty
"""

struct BetaCertainty
    α::Float64  # Success count + prior
    β::Float64  # Failure count + prior
    distribution::Beta{Float64}
end

function BetaCertainty(α::Real, β::Real)
    """
    Create a Beta distribution for certainty modeling.
    α > 0, β > 0
    """
    @assert α > 0 && β > 0 "Parameters must be positive"
    return BetaCertainty(Float64(α), Float64(β), Beta(α, β))
end

function mean_certainty(bc::BetaCertainty)
    """
    Expected certainty: E[X] = α / (α + β)
    """
    return bc.α / (bc.α + bc.β)
end

function variance_certainty(bc::BetaCertainty)
    """
    Uncertainty measure: Var[X] = αβ / [(α+β)²(α+β+1)]
    """
    return (bc.α * bc.β) / ((bc.α + bc.β)^2 * (bc.α + bc.β + 1))
end

function concentration_parameter(bc::BetaCertainty)
    """
    Total concentration: α + β (higher = more certain)
    """
    return bc.α + bc.β
end

function certainty_mode(bc::BetaCertainty)
    """
    Most likely certainty value (mode).
    Mode = (α-1)/(α+β-2) for α,β > 1
    """
    if bc.α > 1 && bc.β > 1
        return (bc.α - 1) / (bc.α + bc.β - 2)
    else
        return mean_certainty(bc)  # Fallback to mean
    end
end

# ============================================================================
# TILE 4: BETA_POSTERIOR_UPDATE
# ============================================================================
"""
TILE: BETA_POSTERIOR_UPDATE
MATH: Beta(α,β) + (s,f) → Beta(α+s, β+f)
JULIA: Conjugate prior update for binary outcomes
USES: HIGH - Efficient certainty learning
"""

function update_beta_posterior(prior::BetaCertainty, successes::Int, failures::Int)
    """
    Update Beta prior with observed successes and failures.
    
    Conjugate update: posterior parameters = prior + observations
    """
    @assert successes >= 0 && failures >= 0 "Counts must be non-negative"
    
    new_α = prior.α + successes
    new_β = prior.β + failures
    
    return BetaCertainty(new_α, new_β)
end

function update_beta_sequential(prior::BetaCertainty, outcomes::AbstractVector{Bool})
    """
    Sequential update with binary outcome observations.
    true = success, false = failure
    """
    successes = count(outcomes)
    failures = length(outcomes) - successes
    
    return update_beta_posterior(prior, successes, failures)
end

function beta_bayes_factor(prior::BetaCertainty, posterior::BetaCertainty)
    """
    Compute Bayes factor for evidence strength.
    """
    return (posterior.α - prior.α + 1) / (posterior.β - prior.β + 1)
end

# ============================================================================
# TILE 5: BAYESIAN_CONFIDENCE_INTERVAL
# ============================================================================
"""
TILE: BAYESIAN_CONFIDENCE_INTERVAL
MATH: Credible interval: P(θ ∈ [a,b] | data) = 1-α
JULIA: Bayesian credible intervals for certainty bounds
USES: HIGH - Uncertainty quantification
"""

struct BayesianCI
    lower::Float64
    upper::Float64
    credibility::Float64
    method::Symbol
end

function beta_credible_interval(bc::BetaCertainty; credibility::Real=0.95, method::Symbol=:equal)
    """
    Compute credible interval for Beta certainty.
    
    Methods:
        :equal - Equal-tailed interval (default)
        :hpd   - Highest posterior density interval
    """
    α = credibility
    dist = bc.distribution
    
    if method == :equal
        lower = quantile(dist, (1 - α) / 2)
        upper = quantile(dist, (1 + α) / 2)
    elseif method == :hpd
        lower, upper = beta_hpd(bc.α, bc.β, α)
    else
        error("Unknown method: $method")
    end
    
    return BayesianCI(lower, upper, credibility, method)
end

function beta_hpd(α::Real, β::Real, credibility::Real)
    """
    Compute highest posterior density interval for Beta.
    Approximated via grid search for simplicity.
    """
    dist = Beta(α, β)
    n_points = 1000
    xs = range(0.001, 0.999, length=n_points)
    densities = pdf.(dist, xs)
    
    # Find the narrowest interval containing (credibility) probability mass
    target_mass = credibility
    best_width = Inf
    best_lower, best_upper = 0.0, 1.0
    
    for i in 1:n_points
        cumulative = 0.0
        for j in i:n_points
            cumulative += densities[j] * (xs[2] - xs[1])
            if cumulative >= target_mass
                width = xs[j] - xs[i]
                if width < best_width
                    best_width = width
                    best_lower, best_upper = xs[i], xs[j]
                end
                break
            end
        end
    end
    
    return best_lower, best_upper
end

function ci_width(ci::BayesianCI)
    """Width of the credible interval (uncertainty measure)."""
    return ci.upper - ci.lower
end

function ci_contains(ci::BayesianCI, value::Real)
    """Check if value lies within credible interval."""
    return ci.lower <= value <= ci.upper
end

# ============================================================================
# TILE 6: DIRICHLET_CERTAINTY
# ============================================================================
"""
TILE: DIRICHLET_CERTAINTY
MATH: Dir(α): f(x) ∝ ∏ᵢ xᵢ^(αᵢ-1), Σxᵢ = 1
JULIA: Multi-dimensional certainty for K categories
USES: HIGH - Multi-class certainty estimation
"""

struct DirichletCertainty
    α::Vector{Float64}      # Concentration parameters
    K::Int                   # Number of categories
    distribution::Dirichlet{Float64, Vector{Float64}}
end

function DirichletCertainty(α::AbstractVector{<:Real})
    """
    Create Dirichlet distribution for multi-category certainty.
    All αᵢ > 0
    """
    @assert all(α .> 0) "All concentration parameters must be positive"
    α_vec = Float64.(α)
    return DirichletCertainty(α_vec, length(α_vec), Dirichlet(α_vec))
end

function mean_certainty(dc::DirichletCertainty)
    """
    Expected certainty for each category.
    E[xᵢ] = αᵢ / Σⱼαⱼ
    """
    total = sum(dc.α)
    return dc.α ./ total
end

function variance_certainty(dc::DirichletCertainty)
    """
    Variance for each category certainty.
    Var[xᵢ] = αᵢ(α₀-αᵢ) / [α₀²(α₀+1)], α₀ = Σⱼαⱼ
    """
    α₀ = sum(dc.α)
    return @. dc.α * (α₀ - dc.α) / (α₀^2 * (α₀ + 1))
end

function concentration_parameter(dc::DirichletCertainty)
    """
    Total concentration (higher = more certain overall).
    α₀ = Σᵢαᵢ
    """
    return sum(dc.α)
end

function entropy_certainty(dc::DirichletCertainty)
    """
    Entropy of expected certainty (uncertainty measure).
    """
    p = mean_certainty(dc)
    return -sum(p[p .> 0] .* log.(p[p .> 0]))
end

# ============================================================================
# TILE 7: DIRICHLET_POSTERIOR_UPDATE
# ============================================================================
"""
TILE: DIRICHLET_POSTERIOR_UPDATE
MATH: Dir(α) + counts → Dir(α + counts)
JULIA: Conjugate update for multinomial observations
USES: HIGH - Multi-class certainty learning
"""

function update_dirichlet_posterior(
    prior::DirichletCertainty, 
    counts::AbstractVector{<:Integer}
)
    """
    Update Dirichlet prior with observed counts.
    
    Posterior: Dir(α₁+n₁, ..., αₖ+nₖ)
    """
    @assert length(counts) == prior.K "Counts must match number of categories"
    @assert all(counts .>= 0) "Counts must be non-negative"
    
    new_α = prior.α .+ counts
    return DirichletCertainty(new_α)
end

function dirichlet_predictive_probability(dc::DirichletCertainty)
    """
    Posterior predictive probability for next observation.
    P(xᵢ=1) = E[xᵢ] = αᵢ / Σⱼαⱼ
    """
    return mean_certainty(dc)
end

function dirichlet_bayes_factor(prior::DirichletCertainty, posterior::DirichletCertainty)
    """
    Evidence strength across all categories.
    """
    return (posterior.α .- prior.α .+ 1) ./ sum(posterior.α)
end

# ============================================================================
# TILE 8: NORMAL_NORMAL_CONJUGATE
# ============================================================================
"""
TILE: NORMAL_NORMAL_CONJUGATE
MATH: N(μ₀,σ₀²) + data N(μ,σ²) → N(μₙ,σₙ²)
JULIA: Conjugate update for unknown mean with known variance
USES: MED - Continuous parameter certainty
"""

struct NormalCertainty
    μ::Float64      # Mean
    σ²::Float64     # Variance
    distribution::Normal{Float64}
end

function NormalCertainty(μ::Real, σ²::Real)
    """
    Create Normal distribution for certainty modeling.
    """
    @assert σ² > 0 "Variance must be positive"
    return NormalCertainty(Float64(μ), Float64(σ²), Normal(μ, sqrt(σ²)))
end

function update_normal_posterior(
    prior::NormalCertainty, 
    data::AbstractVector{<:Real},
    known_σ²::Real
)
    """
    Update Normal prior with data (known variance).
    
    Posterior:
        μₙ = (μ₀/σ₀² + n*x̄/σ²) / (1/σ₀² + n/σ²)
        σₙ² = 1 / (1/σ₀² + n/σ²)
    """
    n = length(data)
    x̄ = mean(data)
    
    μ₀ = prior.μ
    σ₀² = prior.σ²
    
    # Precision-weighted update
    precision_prior = 1 / σ₀²
    precision_data = n / known_σ²
    
    σₙ² = 1 / (precision_prior + precision_data)
    μₙ = σₙ² * (μ₀ * precision_prior + n * x̄ / known_σ²)
    
    return NormalCertainty(μₙ, σₙ²)
end

function normal_credible_interval(nc::NormalCertainty; credibility::Real=0.95)
    """
    Credible interval for Normal certainty.
    """
    z = quantile(Normal(), (1 + credibility) / 2)
    margin = z * sqrt(nc.σ²)
    return BayesianCI(nc.μ - margin, nc.μ + margin, credibility, :equal)
end

# ============================================================================
# TILE 9: GAMMA_POISSON_CONJUGATE
# ============================================================================
"""
TILE: GAMMA_POISSON_CONJUGATE
MATH: Gamma(α,β) + Poisson data → Gamma(α+Σxᵢ, β+n)
JULIA: Conjugate update for Poisson rate parameter
USES: MED - Count/certainty estimation
"""

struct GammaCertainty
    α::Float64      # Shape
    β::Float64      # Rate (inverse scale)
    distribution::Gamma{Float64}
end

function GammaCertainty(α::Real, β::Real)
    """
    Create Gamma distribution for rate certainty.
    α > 0 (shape), β > 0 (rate parameter)
    """
    @assert α > 0 && β > 0 "Parameters must be positive"
    # Julia Gamma uses shape and scale (θ = 1/β)
    return GammaCertainty(Float64(α), Float64(β), Gamma(α, 1/β))
end

function update_gamma_posterior(
    prior::GammaCertainty, 
    data::AbstractVector{<:Integer}
)
    """
    Update Gamma prior with Poisson observations.
    
    Posterior:
        αₙ = α₀ + Σxᵢ
        βₙ = β₀ + n
    """
    αₙ = prior.α + sum(data)
    βₙ = prior.β + length(data)
    
    return GammaCertainty(αₙ, βₙ)
end

function mean_rate(gc::GammaCertainty)
    """
    Expected rate: E[λ] = α/β
    """
    return gc.α / gc.β
end

function variance_rate(gc::GammaCertainty)
    """
    Variance: Var[λ] = α/β²
    """
    return gc.α / gc.β^2
end

# ============================================================================
# TILE 10: BAYESIAN_MODEL_COMPARISON
# ============================================================================
"""
TILE: BAYESIAN_MODEL_COMPARISON
MATH: BF₁₂ = P(D|M₁)/P(D|M₂) = posterior_odds / prior_odds
JULIA: Bayes factor for model/hypothesis comparison
USES: HIGH - Relative certainty assessment
"""

struct BayesFactor
    value::Float64
    log_value::Float64
    interpretation::String
end

function compute_bayes_factor(
    marginal_likelihood_1::Real,
    marginal_likelihood_2::Real
)
    """
    Compute Bayes factor for model comparison.
    
    BF₁₂ > 1: Evidence favors M₁
    BF₁₂ < 1: Evidence favors M₂
    """
    bf = marginal_likelihood_1 / marginal_likelihood_2
    log_bf = log(bf)
    
    # Interpretation (Kass & Raftery 1995)
    interpretation = if abs(log_bf) < log(3)
        "Not worth mentioning"
    elseif abs(log_bf) < log(20)
        "Positive evidence"
    elseif abs(log_bf) < log(150)
        "Strong evidence"
    else
        "Very strong evidence"
    end
    
    return BayesFactor(bf, log_bf, interpretation)
end

function posterior_odds(prior_odds::Real, bf::BayesFactor)
    """
    Compute posterior odds: posterior_odds = prior_odds × BF
    """
    return prior_odds * bf.value
end

function posterior_model_probability(prior_prob::Real, bf::BayesFactor)
    """
    Compute posterior probability of model 1.
    P(M₁|D) = prior_odds × BF / (1 + prior_odds × BF)
    """
    prior_odds = prior_prob / (1 - prior_prob)
    post_odds = prior_odds * bf.value
    return post_odds / (1 + post_odds)
end

# ============================================================================
# TILE 11: BAYESIAN_POINT_ESTIMATES
# ============================================================================
"""
TILE: BAYESIAN_POINT_ESTIMATES
MATH: MAP = argmax P(θ|D), Posterior Mean = E[θ|D]
JULIA: Point estimates from posterior distributions
USES: HIGH - Certainty summarization
"""

function beta_map(bc::BetaCertainty)
    """
    Maximum a posteriori (MAP) estimate for Beta.
    θ_MAP = (α-1)/(α+β-2) for α,β > 1
    """
    if bc.α > 1 && bc.β > 1
        return (bc.α - 1) / (bc.α + bc.β - 2)
    else
        error("MAP undefined for α≤1 or β≤1")
    end
end

function beta_posterior_mean(bc::BetaCertainty)
    """
    Posterior mean (minimizes squared error loss).
    """
    return mean_certainty(bc)
end

function beta_posterior_median(bc::BetaCertainty)
    """
    Posterior median (minimizes absolute error loss).
    """
    return median(bc.distribution)
end

function loss_optimal_estimate(bc::BetaCertainty, loss::Symbol=:squared)
    """
    Compute optimal estimate under different loss functions.
    
    :squared → mean (default)
    :absolute → median
    :zero_one → MAP
    """
    if loss == :squared
        return mean_certainty(bc)
    elseif loss == :absolute
        return median(bc.distribution)
    elseif loss == :zero_one
        return beta_map(bc)
    else
        error("Unknown loss function: $loss")
    end
end

# ============================================================================
# TILE 12: PRIOR_SPECIFICATION
# ============================================================================
"""
TILE: PRIOR_SPECIFICATION
MATH: Uninformative: Jeffreys prior ∝ √I(θ)
JULIA: Construct informative and uninformative priors
USES: HIGH - Initial certainty setting
"""

function uniform_prior()
    """
    Uniform (uninformative) prior for [0,1] parameter.
    Beta(1, 1)
    """
    return BetaCertainty(1.0, 1.0)
end

function jeffreys_prior_beta()
    """
    Jeffreys prior for Bernoulli/Binomial.
    Beta(0.5, 0.5)
    """
    return BetaCertainty(0.5, 0.5)
end

function haldane_prior()
    """
    Haldane (improper) prior for extreme uncertainty.
    Beta(ε, ε) where ε → 0
    """
    ε = 1e-6
    return BetaCertainty(ε, ε)
end

function informative_beta_prior(mean::Real, effective_n::Real)
    """
    Construct informative Beta prior from mean and effective sample size.
    
    mean = α / (α + β)
    effective_n = α + β (pseudo-counts)
    """
    @assert 0 < mean < 1 "Mean must be in (0,1)"
    @assert effective_n > 0 "Effective sample size must be positive"
    
    α = mean * effective_n
    β = (1 - mean) * effective_n
    
    return BetaCertainty(α, β)
end

function dirichlet_uniform_prior(K::Int)
    """
    Uniform Dirichlet prior for K categories.
    Dir(1, 1, ..., 1)
    """
    return DirichletCertainty(ones(K))
end

function dirichlet_jeffreys_prior(K::Int)
    """
    Jeffreys prior for multinomial.
    Dir(0.5, 0.5, ..., 0.5)
    """
    return DirichletCertainty(fill(0.5, K))
end

# ============================================================================
# TILE 13: PREDICTIVE_DISTRIBUTION
# ============================================================================
"""
TILE: PREDICTIVE_DISTRIBUTION
MATH: P(x̃|D) = ∫ P(x̃|θ)P(θ|D) dθ
JULIA: Posterior predictive distribution
USES: HIGH - Future certainty prediction
"""

function beta_bernoulli_predictive(bc::BetaCertainty)
    """
    Predictive probability for next Bernoulli success.
    P(x=1|D) = E[θ|D] = α / (α+β)
    """
    return mean_certainty(bc)
end

function beta_binomial_predictive(bc::BetaCertainty, n::Int)
    """
    Predictive distribution for Binomial(n, θ).
    Returns Beta-Binomial distribution parameters.
    
    P(k|n,D) = C(n,k) × B(α+k, β+n-k) / B(α, β)
    """
    return (α = bc.α, β = bc.β, n = n)
end

function dirichlet_multinomial_predictive(dc::DirichletCertainty)
    """
    Predictive probabilities for next multinomial observation.
    P(xᵢ=1|D) = E[xᵢ|D] = αᵢ / Σⱼαⱼ
    """
    return mean_certainty(dc)
end

function normal_predictive(nc::NormalCertainty, known_σ²::Real)
    """
    Predictive distribution for next observation.
    N(μₙ, σₙ² + σ²) - posterior mean with added variance
    """
    total_variance = nc.σ² + known_σ²
    return NormalCertainty(nc.μ, total_variance)
end

# ============================================================================
# TILE 14: EVIDENCE_ACCUMULATION
# ============================================================================
"""
TILE: EVIDENCE_ACCUMULATION
MATH: log(P(H|E)) = log(P(H)) + Σᵢ log(P(Eᵢ|H)) - log(P(E))
JULIA: Log-space evidence accumulation for numerical stability
USES: HIGH - Long evidence chains
"""

struct EvidenceAccumulator
    log_prior::Float64
    log_likelihood_sum::Float64
    n_evidence::Int
end

function EvidenceAccumulator(prior::Real)
    """
    Initialize evidence accumulator with prior probability.
    """
    @assert 0 < prior < 1 "Prior must be in (0,1)"
    return EvidenceAccumulator(log(prior), 0.0, 0)
end

function add_evidence!(acc::EvidenceAccumulator, likelihood::Real)
    """
    Add evidence observation to accumulator.
    likelihood: P(E|H)
    """
    @assert 0 ≤ likelihood ≤ 1 "Likelihood must be in [0,1]"
    acc.log_likelihood_sum += log(max(likelihood, 1e-300))
    acc.n_evidence += 1
    return acc
end

function add_evidence_pair!(
    acc::EvidenceAccumulator, 
    likelihood_h::Real,
    likelihood_not_h::Real
)
    """
    Add evidence with both P(E|H) and P(E|¬H) for proper update.
    """
    acc.log_likelihood_sum += log(likelihood_h) - log(likelihood_not_h)
    acc.n_evidence += 1
    return acc
end

function get_posterior(acc::EvidenceAccumulator)
    """
    Compute current posterior probability.
    """
    log_odds = acc.log_prior + acc.log_likelihood_sum
    # Convert log odds to probability
    # log_odds = log(p/(1-p))
    # p = exp(log_odds) / (1 + exp(log_odds))
    if log_odds > 0
        return 1.0 / (1.0 + exp(-log_odds))
    else
        exp_odds = exp(log_odds)
        return exp_odds / (1.0 + exp_odds)
    end
end

function get_log_posterior_odds(acc::EvidenceAccumulator)
    """
    Get log posterior odds.
    """
    return acc.log_prior + acc.log_likelihood_sum
end

function reset!(acc::EvidenceAccumulator, new_prior::Real)
    """
    Reset accumulator with new prior.
    """
    acc.log_prior = log(new_prior)
    acc.log_likelihood_sum = 0.0
    acc.n_evidence = 0
    return acc
end

# ============================================================================
# TILE 15: CERTAINTY_METRICS
# ============================================================================
"""
TILE: CERTAINTY_METRICS
MATH: Various certainty quantification measures
JULIA: Compute certainty and uncertainty metrics from posteriors
USES: HIGH - Certainty assessment
"""

function entropy_binary(p::Real)
    """
    Binary entropy: H(p) = -p log(p) - (1-p) log(1-p)
    Higher = more uncertain.
    """
    if p == 0 || p == 1
        return 0.0
    end
    return -p * log(p) - (1-p) * log(1-p)
end

function gini_impurity(p::Real)
    """
    Gini impurity: G(p) = 2p(1-p)
    Higher = more uncertain.
    """
    return 2 * p * (1 - p)
end

function information_gain(prior::Real, posterior::Real)
    """
    Information gain: H(prior) - H(posterior)
    Positive = reduced uncertainty.
    """
    return entropy_binary(prior) - entropy_binary(posterior)
end

function kl_divergence(p::Real, q::Real)
    """
    KL divergence: D_KL(p||q) for binary distributions.
    Measures how much p differs from q.
    """
    kl = 0.0
    if p > 0
        kl += p * log(p / q)
    end
    if p < 1
        kl += (1-p) * log((1-p) / (1-q))
    end
    return kl
end

function surprise(prior::Real, posterior::Real)
    """
    Bayesian surprise: -log(P(posterior|prior))
    Measures how surprising the update is.
    """
    return -log(min(posterior, 1 - posterior) / min(prior, 1 - prior))
end

function certainty_score(bc::BetaCertainty)
    """
    Aggregate certainty score from Beta posterior.
    Combines mean certainty with concentration.
    """
    mean_c = mean_certainty(bc)
    variance_c = variance_certainty(bc)
    concentration = concentration_parameter(bc)
    
    # Higher concentration and more extreme mean → higher certainty
    # Range: 0 (completely uncertain) to 1 (completely certain)
    uncertainty = sqrt(variance_c) * 2  # Scale std to [0,1] range
    certainty = 1 - min(uncertainty, 1.0)
    
    return certainty
end

# ============================================================================
# TILE 16: HIERARCHICAL_BAYES
# ============================================================================
"""
TILE: HIERARCHICAL_BAYES
MATH: P(θ|D) = ∫ P(θ|φ)P(φ|D) dφ
JULIA: Hierarchical Bayesian certainty models
USES: MED - Multi-level uncertainty
"""

struct HierarchicalBetaCertainty
    # Hyperprior on mean
    μ_α::Float64  # Mean of α prior
    μ_β::Float64  # Mean of β prior
    # Group-level posteriors
    group_posteriors::Vector{BetaCertainty}
end

function hierarchical_beta_update(
    group_data::Vector{Vector{Bool}},
    hyper_prior_α::Real,
    hyper_prior_β::Real
)
    """
    Update hierarchical Beta model with group data.
    Each group has its own Beta(α_g, β_g) parameter.
    Uses empirical Bayes for hyperparameter estimation.
    """
    n_groups = length(group_data)
    
    # Compute group-level statistics
    group_successes = [sum(g) for g in group_data]
    group_failures = [length(g) - sum(g) for g in group_data]
    
    # Empirical Bayes: estimate hyperparameters from data
    total_successes = sum(group_successes)
    total_failures = sum(group_failures)
    
    # Pool information across groups
    global_α = hyper_prior_α + total_successes / n_groups
    global_β = hyper_prior_β + total_failures / n_groups
    
    # Update each group with partial pooling
    posteriors = BetaCertainty[]
    for (s, f) in zip(group_successes, group_failures)
        # Shrinkage towards global mean
        shrunk_α = 0.3 * global_α + 0.7 * (hyper_prior_α + s)
        shrunk_β = 0.3 * global_β + 0.7 * (hyper_prior_β + f)
        push!(posteriors, BetaCertainty(shrunk_α, shrunk_β))
    end
    
    return HierarchicalBetaCertainty(global_α, global_β, posteriors)
end

function shrinkage_factor(hc::HierarchicalBetaCertainty, group_idx::Int)
    """
    Compute shrinkage factor for group estimate.
    Higher = more pooling towards global mean.
    """
    group_post = hc.group_posteriors[group_idx]
    global_conc = hc.μ_α + hc.μ_β
    group_conc = concentration_parameter(group_post)
    
    return global_conc / (global_conc + group_conc)
end

# ============================================================================
# TILE 17: SEQUENTIAL_MONTE_CARLO
# ============================================================================
"""
TILE: SEQUENTIAL_MONTE_CARLO
MATH: Particle filtering for online Bayesian updates
JULIA: SMC for certainty tracking with streaming data
USES: MED - Real-time certainty updates
"""

struct Particle
    θ::Float64           # Parameter value
    weight::Float64      # Importance weight
end

struct SMCFilter
    particles::Vector{Particle}
    n_particles::Int
    ess_threshold::Float64  # Effective sample size
end

function SMCFilter(n_particles::Int, prior::BetaCertainty)
    """
    Initialize SMC filter with particles from prior.
    """
    particles = Particle[]
    for _ in 1:n_particles
        θ = rand(prior.distribution)
        push!(particles, Particle(θ, 1.0/n_particles))
    end
    return SMCFilter(particles, n_particles, n_particles/2)
end

function smc_update!(filter::SMCFilter, observation::Bool)
    """
    Update particles with new Bernoulli observation.
    """
    for p in filter.particles
        # Weight by likelihood
        likelihood = observation ? p.θ : (1 - p.θ)
        p.weight *= likelihood
    end
    
    # Normalize weights
    total_weight = sum(p.weight for p in filter.particles)
    for p in filter.particles
        p.weight /= total_weight
    end
    
    # Resample if ESS too low
    ess = effective_sample_size(filter)
    if ess < filter.ess_threshold
        systematic_resample!(filter)
    end
    
    return filter
end

function effective_sample_size(filter::SMCFilter)
    """
    Effective sample size: 1 / Σwᵢ²
    """
    weights = [p.weight for p in filter.particles]
    return 1 / sum(weights.^2)
end

function systematic_resample!(filter::SMCFilter)
    """
    Systematic resampling to restore particle diversity.
    """
    n = filter.n_particles
    weights = [p.weight for p in filter.particles]
    θs = [p.θ for p in filter.particles]
    
    # Cumulative sum
    cumsum_w = cumsum(weights)
    
    # Systematic resampling
    u0 = rand() / n
    new_indices = Int[]
    for i in 1:n
        u = u0 + (i-1)/n
        idx = searchsortedfirst(cumsum_w, u)
        push!(new_indices, min(idx, n))
    end
    
    # Replace particles
    for i in 1:n
        filter.particles[i] = Particle(θs[new_indices[i]], 1.0/n)
    end
end

function smc_mean(filter::SMCFilter)
    """
    Weighted mean estimate.
    """
    return sum(p.θ * p.weight for p in filter.particles)
end

function smc_variance(filter::SMCFilter)
    """
    Weighted variance estimate.
    """
    μ = smc_mean(filter)
    return sum(p.weight * (p.θ - μ)^2 for p in filter.particles)
end

# ============================================================================
# TILE 18: VARIATIONAL_BAYES
# ============================================================================
"""
TILE: VARIATIONAL_BAYES
MATH: q*(θ) = argmin KL(q(θ)||P(θ|D))
JULIA: Variational inference for approximate posteriors
USES: MED - Large-scale approximate Bayesian inference
"""

struct VariationalBeta
    q_α::Float64
    q_β::Float64
    converged::Bool
    n_iterations::Int
end

function variational_beta_inference(
    data::AbstractVector{Bool},
    prior_α::Real,
    prior_β::Real;
    max_iter::Int=100,
    tol::Float64=1e-6
)
    """
    Variational inference for Beta-Bernoulli model.
    For conjugate models, variational = exact, so this converges immediately.
    """
    n = length(data)
    s = sum(data)
    f = n - s
    
    # For conjugate model: q = exact posterior
    q_α = prior_α + s
    q_β = prior_β + f
    
    return VariationalBeta(q_α, q_β, true, 1)
end

function elbo(vb::VariationalBeta, data::AbstractVector{Bool}, prior_α::Real, prior_β::Real)
    """
    Compute Evidence Lower Bound (ELBO).
    ELBO = E_q[log P(D,θ)] - E_q[log q(θ)]
    """
    q_dist = Beta(vb.q_α, vb.q_β)
    
    # E_q[log q(θ)]
    entropy_q = entropy(q_dist)
    
    # E_q[log P(θ)] - prior term
    prior_dist = Beta(prior_α, prior_β)
    E_log_prior = (prior_α - 1) * digamma(vb.q_α) + 
                  (prior_β - 1) * digamma(vb.q_β) -
                  (prior_α + prior_β - 2) * digamma(vb.q_α + vb.q_β) -
                  logbeta(prior_α, prior_β)
    
    # E_q[log P(D|θ)] - likelihood term
    n = length(data)
    s = sum(data)
    f = n - s
    E_log_lik = s * digamma(vb.q_α) + f * digamma(vb.q_β) - 
                n * digamma(vb.q_α + vb.q_β)
    
    return E_log_prior + E_log_lik + entropy_q
end

function logbeta(α::Real, β::Real)
    """Log of beta function B(α,β)."""
    return loggamma(α) + loggamma(β) - loggamma(α + β)
end

# ============================================================================
# TILE SUMMARY
# ============================================================================

"""
TILE INDEX - JULIA BAYESIAN CERTAINTY TILES
============================================

TILE 1:  BAYES_RULE              - Core Bayes theorem implementation
TILE 2:  POSTERIOR_UPDATE_CHAIN  - Sequential evidence accumulation  
TILE 3:  BETA_PRIOR_CERTAINTY    - Beta distribution for [0,1] certainty
TILE 4:  BETA_POSTERIOR_UPDATE   - Conjugate Beta-Bernoulli update
TILE 5:  BAYESIAN_CONFIDENCE_INTERVAL - Credible intervals
TILE 6:  DIRICHLET_CERTAINTY     - Multi-category certainty
TILE 7:  DIRICHLET_POSTERIOR_UPDATE - Conjugate Dirichlet-Multinomial
TILE 8:  NORMAL_NORMAL_CONJUGATE - Continuous parameter certainty
TILE 9:  GAMMA_POISSON_CONJUGATE - Rate parameter certainty
TILE 10: BAYESIAN_MODEL_COMPARISON - Bayes factors
TILE 11: BAYESIAN_POINT_ESTIMATES - MAP, mean, median
TILE 12: PRIOR_SPECIFICATION     - Prior construction utilities
TILE 13: PREDICTIVE_DISTRIBUTION - Posterior predictive
TILE 14: EVIDENCE_ACCUMULATION   - Log-space updates
TILE 15: CERTAINTY_METRICS       - Entropy, KL divergence, surprise
TILE 16: HIERARCHICAL_BAYES      - Multi-level certainty
TILE 17: SEQUENTIAL_MONTE_CARLO  - Particle filtering
TILE 18: VARIATIONAL_BAYES       - Approximate inference

TOTAL: 18 TILES

USE PRIORITY:
- HIGH: Tiles 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15
- MED:  Tiles 8, 9, 16, 17, 18
- LOW:  None
"""

# Export all public functions
export bayes_rule,
       posterior_update_chain, posterior_update_normalized,
       BetaCertainty, mean_certainty, variance_certainty, 
       concentration_parameter, certainty_mode,
       update_beta_posterior, update_beta_sequential, beta_bayes_factor,
       BayesianCI, beta_credible_interval, ci_width, ci_contains,
       DirichletCertainty, entropy_certainty,
       update_dirichlet_posterior, dirichlet_predictive_probability,
       NormalCertainty, update_normal_posterior, normal_credible_interval,
       GammaCertainty, update_gamma_posterior, mean_rate, variance_rate,
       BayesFactor, compute_bayes_factor, posterior_odds, posterior_model_probability,
       beta_map, beta_posterior_mean, beta_posterior_median, loss_optimal_estimate,
       uniform_prior, jeffreys_prior_beta, haldane_prior, informative_beta_prior,
       dirichlet_uniform_prior, dirichlet_jeffreys_prior,
       beta_bernoulli_predictive, beta_binomial_predictive, 
       dirichlet_multinomial_predictive, normal_predictive,
       EvidenceAccumulator, add_evidence!, add_evidence_pair!, 
       get_posterior, get_log_posterior_odds, reset!,
       entropy_binary, gini_impurity, information_gain, 
       kl_divergence, surprise, certainty_score,
       HierarchicalBetaCertainty, hierarchical_beta_update, shrinkage_factor,
       SMCFilter, smc_update!, effective_sample_size, smc_mean, smc_variance,
       VariationalBeta, variational_beta_inference, elbo

println("Julia Bayesian Certainty Tiles loaded successfully.")
println("Total tiles: 18")
