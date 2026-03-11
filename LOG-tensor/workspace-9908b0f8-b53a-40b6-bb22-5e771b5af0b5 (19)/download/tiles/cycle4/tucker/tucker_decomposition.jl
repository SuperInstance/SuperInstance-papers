#=
Tucker Decomposition Tiles
==========================
Tensor decomposition: T = G ×₁ A ×₂ B ×₃ C

Higher-order SVD with numerical stability.
=#

using LinearAlgebra
using Random

"""
Tucker decomposition result.
"""
struct TuckerResult{T<:AbstractFloat}
    core::Array{T}              # Core tensor
    factors::Vector{Matrix{T}}  # Factor matrices
    reconstruction_error::T
    explained_variance::T
    shape::NTuple{N,Int} where N
    rank::NTuple{N,Int} where N
end

"""
    mode_n_product(tensor, matrix, mode)

Mode-n product of tensor with matrix.
"""
function mode_n_product(tensor::AbstractArray{T,N}, matrix::AbstractMatrix{T}, mode::Int) where {T<:AbstractFloat,N}
    shape = collect(size(tensor))
    shape[mode] = size(matrix, 1)
    
    # Unfold, multiply, fold
    unfolded = unfold_tensor(tensor, mode)
    result = matrix * unfolded
    
    return fold_tensor(result, mode, Tuple(shape))
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
    hosvd(tensor, ranks; tol=1e-10, compute_core=true)

Higher-Order SVD (HOSVD) for Tucker decomposition.
"""
function hosvd(
    tensor::AbstractArray{T,N},
    ranks::NTuple{N,Int};
    tol::T=1e-10,
    compute_core::Bool=true
) where {T<:AbstractFloat,N}
    
    shape = size(tensor)
    
    factors = Matrix{T}[]
    explained_vars = T[]
    
    for mode in 1:N
        # Unfold along mode
        X_n = unfold_tensor(tensor, mode)
        
        # SVD
        F = svd(X_n, full=false)
        
        # Determine effective rank
        if ranks[mode] < length(F.S)
            # Compute explained variance
            total_var = sum(F.S.^2)
            explained = sum(F.S[1:ranks[mode]].^2) / total_var
            push!(explained_vars, explained)
            
            # Truncate
            push!(factors, F.U[:, 1:ranks[mode]])
        else
            push!(explained_vars, 1.0)
            push!(factors, F.U)
        end
    end
    
    # Compute core tensor
    if compute_core
        core = copy(tensor)
        for mode in 1:N
            core = mode_n_product(core, factors[mode]', mode)
        end
    else
        core = zeros(T, ranks)
    end
    
    # Compute reconstruction error
    if compute_core
        reconstructed = reconstruct_tucker(core, factors)
        error = norm(tensor - reconstructed) / norm(tensor)
    else
        error = Inf
    end
    
    return TuckerResult(
        core,
        factors,
        error,
        mean(explained_vars),
        shape,
        ranks
    )
end

"""
    hooi(tensor, ranks; max_iter=100, tol=1e-8, reg=1e-10, init=nothing, rng=nothing)

Higher-Order Orthogonal Iteration (HOOI) for Tucker decomposition.
"""
function hooi(
    tensor::AbstractArray{T,N},
    ranks::NTuple{N,Int};
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
    
    # Initialize factors (HOSVD or random)
    if init === nothing
        result = hosvd(tensor, ranks, compute_core=false)
        factors = result.factors
    else
        factors = [copy(f) for f in init]
    end
    
    tensor_norm = norm(tensor)
    prev_error = Inf
    
    for iteration in 1:max_iter
        # Update each factor
        for mode in 1:N
            # Compute projected tensor (exclude current mode)
            Y = copy(tensor)
            for m in 1:N
                if m != mode
                    Y = mode_n_product(Y, factors[m]', m)
                end
            end
            
            # Unfold and SVD
            Y_unfolded = unfold_tensor(Y, mode)
            
            # Add regularization for stability
            YTY = Y_unfolded * Y_unfolded' + reg * I
            
            # Eigendecomposition for leading eigenvectors
            eigvals, eigvecs = eigen(Hermitian(YTY))
            
            # Sort in descending order
            idx = sortperm(eigvals, rev=true)
            
            # Take top-r eigenvectors
            factors[mode] = eigvecs[:, idx[1:ranks[mode]]]
        end
        
        # Compute core and error
        core = copy(tensor)
        for mode in 1:N
            core = mode_n_product(core, factors[mode]', mode)
        end
        
        reconstructed = reconstruct_tucker(core, factors)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if abs(prev_error - error) < tol
            break
        end
        
        prev_error = error
    end
    
    # Compute final core
    core = copy(tensor)
    for mode in 1:N
        core = mode_n_product(core, factors[mode]', mode)
    end
    
    return TuckerResult(
        core,
        factors,
        error,
        1.0 - error,
        shape,
        ranks
    )
end

"""
    reconstruct_tucker(core, factors)

Reconstruct tensor from Tucker decomposition.
"""
function reconstruct_tucker(core::AbstractArray{T}, factors::Vector{Matrix{T}}) where T<:AbstractFloat
    result = copy(core)
    for (mode, F) in enumerate(factors)
        result = mode_n_product(result, F, mode)
    end
    return result
end

"""
    truncated_tucker(tensor; energy_threshold=0.99, max_rank=nothing)

Truncated Tucker decomposition preserving specified energy.
"""
function truncated_tucker(
    tensor::AbstractArray{T,N};
    energy_threshold::T=0.99,
    max_rank::Union{NTuple{N,Int},Nothing}=nothing
) where {T<:AbstractFloat,N}
    
    shape = size(tensor)
    
    if max_rank === nothing
        max_rank = shape
    end
    
    # Determine ranks based on singular value energy
    ranks = Int[]
    explained_vars = T[]
    
    for mode in 1:N
        X_n = unfold_tensor(tensor, mode)
        F = svd(X_n, full=false)
        
        # Find rank preserving energy
        energy = cumsum(F.S.^2) / sum(F.S.^2)
        rank = searchsortedfirst(energy, energy_threshold)
        rank = min(rank, max_rank[mode], length(F.S))
        push!(ranks, rank)
        
        push!(explained_vars, energy[rank])
    end
    
    return hosvd(tensor, Tuple(ranks))
end

"""
Composable Tucker decomposition type.
"""
struct TuckerDecomposition{T<:AbstractFloat}
    ranks::Union{NTuple{N,Int} where N,Nothing}
    method::Symbol
    max_iter::Int
    tol::T
    reg::T
    result::Union{TuckerResult{T},Nothing}
end

function TuckerDecomposition{T}(; ranks=nothing, method::Symbol=:hooi, 
                                 max_iter::Int=100, tol::T=1e-8, reg::T=1e-10) where T<:AbstractFloat
    TuckerDecomposition{T}(ranks, method, max_iter, tol, reg, nothing)
end

function fit!(tucker::TuckerDecomposition{T}, tensor::AbstractArray{T,N}) where {T<:AbstractFloat,N}
    ranks = tucker.ranks === nothing ? size(tensor) : tucker.ranks
    
    if tucker.method == :hosvd
        result = hosvd(tensor, ranks)
    elseif tucker.method == :hooi
        result = hooi(tensor, ranks; max_iter=tucker.max_iter, tol=tucker.tol, reg=tucker.reg)
    else
        error("Unknown method: $(tucker.method)")
    end
    
    return TuckerDecomposition{T}(ranks, tucker.method, tucker.max_iter, tucker.tol, tucker.reg, result)
end

function compression_ratio(tucker::TuckerDecomposition)
    if tucker.result === nothing
        error("Must fit first")
    end
    
    original_size = prod(tucker.result.shape)
    compressed_size = prod(size(tucker.result.core)) + sum(prod(size(f)) for f in tucker.result.factors)
    
    return original_size / compressed_size
end

# Test code
function test_tucker()
    Random.seed!(42)
    
    # Create a tensor with Tucker structure
    shape = (6, 8, 10)
    ranks = (3, 4, 5)
    
    # Generate random core and factors
    core = randn(ranks)
    factors = [randn(shape[i], ranks[i]) for i in 1:3]
    
    # Create tensor
    tensor = reconstruct_tucker(core, factors)
    
    # Add noise
    tensor .+= 0.1 * randn(shape)
    
    # Perform HOSVD
    result_hosvd = hosvd(tensor, ranks)
    println("HOSVD Results:")
    println("  Reconstruction Error: $(round(result_hosvd.reconstruction_error, digits=6))")
    println("  Explained Variance: $(round(result_hosvd.explained_variance, digits=4))")
    
    # Perform HOOI
    result_hooi = hooi(tensor, ranks, max_iter=50)
    println("\nHOOI Results:")
    println("  Reconstruction Error: $(round(result_hooi.reconstruction_error, digits=6))")
    println("  Explained Variance: $(round(result_hooi.explained_variance, digits=4))")
    
    # Test compression ratio
    tucker = TuckerDecomposition{Float64}(ranks=ranks, method=:hooi, max_iter=50)
    tucker = fit!(tucker, tensor)
    println("\nCompression Ratio: $(round(compression_ratio(tucker), digits=2))x")
end

if abspath(PROGRAM_FILE) == @__FILE__
    test_tucker()
end
