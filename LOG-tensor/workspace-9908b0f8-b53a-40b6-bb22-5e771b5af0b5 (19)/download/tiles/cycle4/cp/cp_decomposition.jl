#=
CP (CANDECOMP/PARAFAC) Decomposition Tiles
==========================================
Tensor decomposition: T = Σᵣ aᵣ ⊗ bᵣ ⊗ cᵣ

Numerical stability focus with regularization and iterative refinement.
=#

using LinearAlgebra
using Random

"""
CP decomposition result.
"""
struct CPResult{T<:AbstractFloat}
    factors::Vector{Matrix{T}}   # Factor matrices [A, B, C, ...]
    weights::Vector{T}           # Weights for each component
    reconstruction_error::T
    iterations::Int
    converged::Bool
end

"""
    khatri_rao(A, B)

Compute Khatri-Rao product (column-wise Kronecker product).
"""
function khatri_rao(A::AbstractMatrix{T}, B::AbstractMatrix{T}) where T<:AbstractFloat
    I, R1 = size(A)
    J, R2 = size(B)
    @assert R1 == R2 "Number of columns must match"
    
    result = zeros(T, I * J, R1)
    for r in 1:R1
        result[:, r] = kron(A[:, r], B[:, r])
    end
    return result
end

"""
    unfold_tensor(tensor, mode)

Unfold tensor along specified mode.
"""
function unfold_tensor(tensor::AbstractArray{T,N}, mode::Int) where {T<:AbstractFloat,N}
    dims = collect(1:N)
    dims[1], dims[mode] = dims[mode], dims[1]
    
    permuted = permutedims(tensor, dims)
    return reshape(permuted, size(tensor, mode), :)
end

"""
    fold_tensor(matrix, mode, shape)

Fold matrix back to tensor along specified mode.
"""
function fold_tensor(matrix::AbstractMatrix{T}, mode::Int, shape::NTuple{N,Int}) where {T<:AbstractFloat,N}
    dims = collect(1:N)
    dims[1], dims[mode] = dims[mode], dims[1]
    
    trans_shape = [shape[d] for d in dims]
    tensor = reshape(matrix, trans_shape...)
    
    inv_perm = zeros(Int, N)
    for (i, d) in enumerate(dims)
        inv_perm[d] = i
    end
    
    return permutedims(tensor, inv_perm)
end

"""
    cp_als(tensor, rank; max_iter=100, tol=1e-8, reg=1e-10, init=nothing, rng=nothing)

CP decomposition via Alternating Least Squares.
"""
function cp_als(
    tensor::AbstractArray{T,N},
    rank::Int;
    max_iter::Int=100,
    tol::T=1e-8,
    reg::T=1e-10,
    init::Union{Vector{Matrix{T}},Nothing}=nothing,
    rng::Union{AbstractRNG,Nothing}=nothing
) where {T<:AbstractFloat,N}
    
    if rng === nothing
        rng = Random.GLOBAL_RNG
    end
    
    shape = size(tensor)
    
    # Initialize factor matrices
    if init === nothing
        factors = [randn(rng, T, s, rank) for s in shape]
        # Normalize columns
        for i in 1:N
            for r in 1:rank
                factors[i][:, r] ./= norm(factors[i][:, r])
            end
        end
    else
        factors = [copy(f) for f in init]
    end
    
    weights = ones(T, rank)
    tensor_norm = norm(tensor)
    
    prev_error = Inf
    converged = false
    iteration = 0
    
    for iter in 1:max_iter
        iteration = iter
        
        for mode in 1:N
            # Compute Khatri-Rao product of all factors except current mode
            kr = ones(T, 1, rank)
            for i in 1:N
                if i != mode
                    kr = khatri_rao(factors[i], kr)
                end
            end
            
            # Unfold tensor
            X_unfolded = unfold_tensor(tensor, mode)
            
            # Solve least squares with regularization
            M = kr .* weights'  # Scale by weights
            
            # Normal equations with regularization
            MtM = M' * M + reg * I
            XtM = X_unfolded * M
            
            # Solve for factor matrix
            factors[mode] = (MtM \ XtM')'
            
            # Normalize and update weights
            col_norms = [norm(factors[mode][:, r]) for r in 1:rank]
            col_norms = max.(col_norms, 1e-10)
            weights .*= col_norms
            for r in 1:rank
                factors[mode][:, r] ./= col_norms[r]
            end
        end
        
        # Compute reconstruction error
        reconstructed = reconstruct_cp(factors, weights)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if abs(prev_error - error) < tol
            converged = true
            break
        end
        
        prev_error = error
    end
    
    return CPResult(factors, weights, prev_error, iteration, converged)
end

"""
    reconstruct_cp(factors, weights)

Reconstruct tensor from CP factors.
"""
function reconstruct_cp(factors::Vector{Matrix{T}}, weights::Vector{T}) where T<:AbstractFloat
    N = length(factors)
    rank = size(factors[1], 2)
    shape = Tuple(size(factors[i], 1) for i in 1:N)
    
    # Weight the first factor
    weighted_factors = [factors[1] .* weights']
    push!(weighted_factors, factors[2:end]...)
    
    # Compute outer product sum
    result = zeros(T, shape)
    for r in 1:rank
        component = weighted_factors[1][:, r]
        for i in 2:N
            component = reshape(component, :, 1) * weighted_factors[i][:, r]'
            component = reshape(component, shape[1:i]...)
        end
        result .+= component
    end
    
    return result
end

"""
    cp_nls(tensor, rank; max_iter=100, tol=1e-8, reg=1e-10, rng=nothing)

CP decomposition via Nonlinear Least Squares (more stable).
"""
function cp_nls(
    tensor::AbstractArray{T,N},
    rank::Int;
    max_iter::Int=100,
    tol::T=1e-8,
    reg::T=1e-10,
    rng::Union{AbstractRNG,Nothing}=nothing
) where {T<:AbstractFloat,N}
    
    if rng === nothing
        rng = Random.GLOBAL_RNG
    end
    
    shape = size(tensor)
    
    # Initialize with SVD-based method
    factors = Matrix{T}[]
    for (i, s) in enumerate(shape)
        unfolded = unfold_tensor(tensor, i)
        F = svd(unfolded)
        if rank <= length(F.S)
            push!(factors, F.U[:, 1:rank])
        else
            extra = randn(rng, T, s, rank - length(F.S))
            push!(factors, hcat(F.U, extra))
        end
    end
    
    weights = ones(T, rank)
    tensor_norm = norm(tensor)
    
    prev_error = Inf
    converged = false
    iteration = 0
    
    for iter in 1:max_iter
        iteration = iter
        
        for mode in 1:N
            kr = ones(T, 1, rank)
            for i in 1:N
                if i != mode
                    kr = khatri_rao(factors[i], kr)
                end
            end
            
            X_unfolded = unfold_tensor(tensor, mode)
            M = kr .* weights'
            
            # Use SVD for numerical stability
            F = svd(M)
            
            # Filter small singular values
            mask = F.S .> reg * F.S[1]
            S_inv = zeros(T, length(F.S))
            S_inv[mask] .= 1.0 ./ F.S[mask]
            
            # Compute solution
            factors[mode] = X_unfolded * (F.Vt' .* S_inv') * F.U'
            
            # Normalize
            col_norms = [norm(factors[mode][:, r]) for r in 1:rank]
            col_norms = max.(col_norms, 1e-10)
            weights .*= col_norms
            for r in 1:rank
                factors[mode][:, r] ./= col_norms[r]
            end
        end
        
        reconstructed = reconstruct_cp(factors, weights)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if abs(prev_error - error) < tol
            converged = true
            break
        end
        
        prev_error = error
    end
    
    return CPResult(factors, weights, prev_error, iteration, converged)
end

"""
Composable CP decomposition type.
"""
struct CPDecomposition{T<:AbstractFloat}
    rank::Int
    method::Symbol
    max_iter::Int
    tol::T
    reg::T
    result::Union{CPResult{T},Nothing}
    
    function CPDecomposition{T}(rank::Int; method::Symbol=:als, max_iter::Int=100, 
                                 tol::T=1e-8, reg::T=1e-10) where T<:AbstractFloat
        new{T}(rank, method, max_iter, tol, reg, nothing)
    end
end

function fit!(cp::CPDecomposition{T}, tensor::AbstractArray{T,N}) where {T<:AbstractFloat,N}
    if cp.method == :als
        result = cp_als(tensor, cp.rank; max_iter=cp.max_iter, tol=cp.tol, reg=cp.reg)
    elseif cp.method == :nls
        result = cp_nls(tensor, cp.rank; max_iter=cp.max_iter, tol=cp.tol, reg=cp.reg)
    else
        error("Unknown method: $(cp.method)")
    end
    
    return CPDecomposition{T}(cp.rank; method=cp.method, max_iter=cp.max_iter, 
                               tol=cp.tol, reg=cp.reg)
end

"""
    check_cp_stability(factors, weights)

Check numerical stability of CP decomposition.
"""
function check_cp_stability(factors::Vector{Matrix{T}}, weights::Vector{T}) where T<:AbstractFloat
    diagnostics = Dict{Symbol,Any}()
    
    diagnostics[:weight_condition] = maximum(abs.(weights)) / minimum(abs.(weights))
    diagnostics[:factor_conditions] = T[]
    
    for F in factors
        s = svd(F).S
        cond = s[1] / s[end]
        push!(diagnostics[:factor_conditions], cond)
    end
    
    diagnostics[:min_weight] = minimum(abs.(weights))
    diagnostics[:max_weight] = maximum(abs.(weights))
    
    return diagnostics
end

# Test code
function test_cp()
    Random.seed!(42)
    
    # Create a low-rank tensor
    true_rank = 3
    shape = (4, 5, 6)
    
    # Generate ground truth factors
    A = randn(shape[1], true_rank)
    B = randn(shape[2], true_rank)
    C = randn(shape[3], true_rank)
    
    # Create tensor
    tensor = zeros(shape...)
    for r in 1:true_rank
        tensor .+= reshape(A[:, r], :, 1, 1) .* reshape(B[:, r], 1, :, 1) .* reshape(C[:, r], 1, 1, :)
    end
    
    # Add small noise
    tensor .+= 0.01 * randn(shape...)
    
    # Perform CP decomposition
    result = cp_als(tensor, true_rank, max_iter=50, rng=Random.GLOBAL_RNG)
    
    println("CP Decomposition Results:")
    println("  Converged: $(result.converged)")
    println("  Iterations: $(result.iterations)")
    println("  Reconstruction Error: $(round(result.reconstruction_error, digits=6))")
    
    # Check stability
    diagnostics = check_cp_stability(result.factors, result.weights)
    println("\nStability Diagnostics:")
    println("  Weight condition: $(round(diagnostics[:weight_condition], digits=2))")
end

# Run test if this is the main file
if abspath(PROGRAM_FILE) == @__FILE__
    test_cp()
end
