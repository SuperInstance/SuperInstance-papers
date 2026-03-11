#=
Singular Value Decomposition (SVD) Tiles
========================================
Matrix decomposition: M = U Σ V'

Numerically stable SVD with composability.
=#

using LinearAlgebra
using Random

"""
SVD decomposition result.
"""
struct SVDResult{T<:AbstractFloat}
    U::Matrix{T}           # Left singular vectors
    S::Vector{T}           # Singular values
    Vt::Matrix{T}          # Right singular vectors (transposed)
    rank::Int              # Numerical rank
    condition_number::T
    reconstruction_error::T
end

"""
    stable_svd(matrix; full_matrices=true, compute_uv=true)

Numerically stable SVD with diagnostics.
"""
function stable_svd(
    matrix::AbstractMatrix{T};
    full_matrices::Bool=true,
    compute_uv::Bool=true
) where T<:AbstractFloat
    
    m, n = size(matrix)
    
    # Use Julia's SVD
    F = svd(matrix, full=full_matrices)
    
    U = F.U
    S = F.S
    Vt = F.Vt
    
    # Compute numerical rank
    tol = max(m, n) * eps(T) * (isempty(S) ? 0 : S[1])
    rank = sum(S .> tol)
    
    # Condition number
    cond = isempty(S) ? Inf : (S[end] > 0 ? S[1] / S[end] : Inf)
    
    # Reconstruction error
    if compute_uv && full_matrices
        reconstructed = U * Diagonal(S) * Vt
        error = norm(matrix - reconstructed) / norm(matrix)
    else
        error = zero(T)
    end
    
    return SVDResult(U, S, Vt, rank, cond, error)
end

"""
    truncated_svd(matrix; rank=nothing, energy_threshold=nothing, tol=1e-10)

Truncated SVD for low-rank approximation.
"""
function truncated_svd(
    matrix::AbstractMatrix{T};
    rank::Union{Int,Nothing}=nothing,
    energy_threshold::Union{T,Nothing}=nothing,
    tol::T=1e-10
) where T<:AbstractFloat
    
    F = svd(matrix, full=false)
    
    m, n = size(matrix)
    
    # Determine truncation rank
    if rank !== nothing
        k = min(rank, length(F.S))
    elseif energy_threshold !== nothing
        energy = cumsum(F.S.^2) / sum(F.S.^2)
        k = searchsortedfirst(energy, energy_threshold)
    else
        # Automatic rank determination
        k = sum(F.S .> tol * F.S[1])
    end
    
    # Truncate
    U_k = F.U[:, 1:k]
    S_k = F.S[1:k]
    Vt_k = F.Vt[1:k, :]
    
    # Compute error
    reconstructed = U_k * Diagonal(S_k) * Vt_k
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SVDResult(
        U_k,
        S_k,
        Vt_k,
        k,
        isempty(S_k) ? Inf : (S_k[end] > 0 ? F.S[1] / S_k[end] : Inf),
        error
    )
end

"""
    randomized_svd(matrix, rank; oversampling=10, power_iterations=2, rng=nothing)

Randomized SVD for large matrices.
"""
function randomized_svd(
    matrix::AbstractMatrix{T},
    rank::Int;
    oversampling::Int=10,
    power_iterations::Int=2,
    rng::Union{AbstractRNG,Nothing}=nothing
) where T<:AbstractFloat
    
    if rng === nothing
        rng = Random.GLOBAL_RNG
    end
    
    m, n = size(matrix)
    k = rank + oversampling
    
    # Random projection
    Omega = randn(rng, T, n, k)
    Y = matrix * Omega
    
    # Power iterations for improved accuracy
    for _ in 1:power_iterations
        Y = matrix * (matrix' * Y)
    end
    
    # Orthonormalize
    Q = Matrix(qr(Y).Q)
    
    # Project and SVD
    B = Q' * matrix
    F = svd(B, full=false)
    
    # Map back
    U = Q * F.U
    
    # Truncate to desired rank
    U = U[:, 1:rank]
    S = F.S[1:rank]
    Vt = F.Vt[1:rank, :]
    
    # Compute error
    reconstructed = U * Diagonal(S) * Vt
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SVDResult(
        U,
        S,
        Vt,
        rank,
        isempty(S) ? Inf : (S[end] > 0 ? S[1] / S[end] : Inf),
        error
    )
end

"""
    svd_pseudoinverse(matrix; tol=1e-10, condition_limit=nothing)

Compute pseudoinverse using SVD with numerical stability.
"""
function svd_pseudoinverse(
    matrix::AbstractMatrix{T};
    tol::T=1e-10,
    condition_limit::Union{T,Nothing}=nothing
) where T<:AbstractFloat
    
    F = svd(matrix, full=false)
    
    # Determine which singular values to invert
    effective_tol = tol
    if condition_limit !== nothing && !isempty(F.S) && F.S[1] > 0
        effective_tol = max(tol, F.S[1] / condition_limit)
    end
    
    mask = F.S .> effective_tol
    
    # Compute pseudoinverse
    S_inv = zeros(T, length(F.S))
    S_inv[mask] .= 1.0 ./ F.S[mask]
    
    return F.Vt' * Diagonal(S_inv) * F.U'
end

"""
    procrustes_svd(A, B)

Solve orthogonal Procrustes problem via SVD.
"""
function procrustes_svd(A::AbstractMatrix{T}, B::AbstractMatrix{T}) where T<:AbstractFloat
    F = svd(A' * B, full=false)
    Q = F.U * F.Vt
    
    error = norm(A * Q - B)
    
    return Q, error
end

"""
Composable SVD decomposition type.
"""
struct SVDDecomposition{T<:AbstractFloat}
    rank::Union{Int,Nothing}
    method::Symbol
    result::Union{SVDResult{T},Nothing}
end

function SVDDecomposition{T}(; rank=nothing, method::Symbol=:truncated) where T<:AbstractFloat
    SVDDecomposition{T}(rank, method, nothing)
end

function fit!(svd_dec::SVDDecomposition{T}, matrix::AbstractMatrix{T}) where T<:AbstractFloat
    if svd_dec.method == :truncated
        result = truncated_svd(matrix, rank=svd_dec.rank)
    elseif svd_dec.method == :randomized
        if svd_dec.rank === nothing
            error("Rank must be specified for randomized SVD")
        end
        result = randomized_svd(matrix, svd_dec.rank)
    elseif svd_dec.method == :stable
        result = stable_svd(matrix)
    else
        error("Unknown method: $(svd_dec.method)")
    end
    
    return SVDDecomposition{T}(svd_dec.rank, svd_dec.method, result)
end

function explained_variance_ratio(svd_dec::SVDDecomposition)
    if svd_dec.result === nothing
        error("Must fit first")
    end
    
    return svd_dec.result.S.^2 ./ sum(svd_dec.result.S.^2)
end

function Base.:*(svd1::SVDDecomposition{T}, svd2::SVDDecomposition{T}) where T<:AbstractFloat
    if svd1.result === nothing || svd2.result === nothing
        error("Both decompositions must be fitted")
    end
    
    # Compute product of low-rank approximations
    inner = Diagonal(svd1.result.S) * svd1.result.Vt * svd2.result.U * Diagonal(svd2.result.S)
    
    # SVD of result
    F = svd(inner, full=false)
    
    result = SVDResult(
        svd1.result.U * F.U,
        F.S,
        F.Vt * svd2.result.Vt,
        length(F.S),
        F.S[end] > 0 ? F.S[1] / F.S[end] : Inf,
        zero(T)
    )
    
    return SVDDecomposition{T}(length(F.S), :truncated, result)
end

# Test code
function test_svd()
    Random.seed!(42)
    
    # Create a low-rank matrix
    m, n, rank = 100, 80, 10
    U_true = randn(m, rank)
    V_true = randn(n, rank)
    matrix = U_true * V_true'
    
    # Add noise
    matrix .+= 0.1 * randn(m, n)
    
    # Test truncated SVD
    result = truncated_svd(matrix, rank=rank)
    println("Truncated SVD (rank=$rank):")
    println("  Condition number: $(round(result.condition_number, digits=2))")
    println("  Reconstruction error: $(round(result.reconstruction_error, sigdigits=2))")
    println("  Numerical rank: $(result.rank)")
    
    # Test randomized SVD
    result_rand = randomized_svd(matrix, rank)
    println("\nRandomized SVD:")
    println("  Reconstruction error: $(round(result_rand.reconstruction_error, sigdigits=2))")
    
    # Test pseudoinverse
    pinv = svd_pseudoinverse(matrix[1:50, 1:50])
    error = norm(matrix[1:50, 1:50] * pinv * matrix[1:50, 1:50] - matrix[1:50, 1:50])
    println("\nPseudoinverse test:")
    println("  ||A @ A+ @ A - A||: $(round(error, sigdigits=2))")
end

if abspath(PROGRAM_FILE) == @__FILE__
    test_svd()
end
