#=
Tensor Train (TT) Decomposition Tiles
=====================================
Tensor decomposition: T = G₁ × G₂ × ... × Gₙ

Matrix Product State representation with numerical stability.
=#

using LinearAlgebra
using Random

"""
Tensor Train decomposition result.
"""
struct TTResult{T<:AbstractFloat}
    cores::Vector{Array{T,3}}  # TT cores
    ranks::Vector{Int}          # TT ranks (r_0, r_1, ..., r_n) where r_0 = r_n = 1
    reconstruction_error::T
    compression_ratio::T
    shape::NTuple{N,Int} where N
end

"""
    tt_svd(tensor; eps=1e-10, max_ranks=nothing, relative_eps=true)

Tensor Train decomposition via SVD.
"""
function tt_svd(
    tensor::AbstractArray{T,N};
    eps::T=1e-10,
    max_ranks::Union{NTuple{N,Int},Nothing}=nothing,
    relative_eps::Bool=true
) where {T<:AbstractFloat,N}
    
    shape = size(tensor)
    
    if max_ranks === nothing
        max_ranks = ntuple(i -> min(prod(shape[1:i]), prod(shape[i+1:end])), N)
        max_ranks = (1, max_ranks..., 1)
    end
    
    # Reshape to matrix for first SVD
    current = reshape(tensor, shape[1], :)
    
    cores = Array{T,3}[]
    ranks = [1]
    
    for i in 1:(N-1)
        # SVD
        F = svd(current, full=false)
        
        # Determine truncation rank
        if relative_eps && length(F.S) > 0
            threshold = eps * F.S[1]
        else
            threshold = eps
        end
        
        rank = min(
            sum(F.S .> threshold),
            max_ranks[i+1],
            length(F.S)
        )
        
        # Truncate
        U = F.U[:, 1:rank]
        S = F.S[1:rank]
        Vt = F.Vt[1:rank, :]
        
        # Reshape core
        if i == 1
            core = reshape(U, 1, shape[1], rank)
        else
            core = reshape(U, ranks[end], shape[i], rank)
        end
        
        push!(cores, core)
        push!(ranks, rank)
        
        # Prepare for next iteration
        current = Diagonal(S) * Vt
        current = reshape(current, rank * shape[i+1], :)
    end
    
    # Last core
    last_core = reshape(current, ranks[end], shape[end], 1)
    push!(cores, last_core)
    
    # Compute reconstruction error
    reconstructed = reconstruct_tt(cores)
    error = norm(tensor - reconstructed) / norm(tensor)
    
    # Compression ratio
    original_size = prod(shape)
    compressed_size = sum(prod(size(c)) for c in cores)
    
    return TTResult(
        cores,
        ranks,
        error,
        original_size / compressed_size,
        shape
    )
end

"""
    reconstruct_tt(cores)

Reconstruct full tensor from TT cores.
"""
function reconstruct_tt(cores::Vector{Array{T,3}}) where T<:AbstractFloat
    if isempty(cores)
        error("Empty cores list")
    end
    
    N = length(cores)
    
    # Start with first core
    result = dropdims(cores[1], dims=1)  # (n1, r2)
    
    # Contract through all cores
    for (i, core) in enumerate(cores[2:end], 2)
        # result: (n1*n2*...*n_{i-1}, r_i)
        # core: (r_i, n_i, r_{i+1})
        result = result * reshape(core, size(core, 1), :)
        result = reshape(result, :, size(core, 3))
    end
    
    # Reshape to tensor
    shape = Tuple(size(c, 2) for c in cores)
    return reshape(result, shape)
end

"""
    tt_rounding(cores; eps=1e-10)

TT rounding (compression) via orthogonalization.
"""
function tt_rounding(cores::Vector{Array{T,3}}; eps::T=1e-10) where T<:AbstractFloat
    N = length(cores)
    
    # Left-to-right orthogonalization
    for i in 1:(N-1)
        core = cores[i]
        r1, n, r2 = size(core)
        
        # Reshape and QR
        Q, R = qr(reshape(core, r1 * n, r2))
        Q = Matrix(Q)
        
        # Update core
        new_r2 = size(Q, 2)
        cores[i] = reshape(Q, r1, n, new_r2)
        
        # Multiply R into next core
        cores[i+1] = cat([R * cores[i+1][:, :, k] for k in 1:size(cores[i+1], 3)]..., dims=3)
    end
    
    # Right-to-left SVD compression
    for i in N:-1:2
        core = cores[i]
        r1, n, r2 = size(core)
        
        # Reshape and SVD
        F = svd(reshape(core, r1, n * r2), full=false)
        
        # Truncate
        rank = min(sum(F.S .> eps * F.S[1]), length(F.S))
        U = F.U[:, 1:rank]
        S = F.S[1:rank]
        Vt = F.Vt[1:rank, :]
        
        # Update cores
        cores[i] = reshape(Vt, rank, n, r2)
        cores[i-1] = cat([cores[i-1][:, :, k] * (U * Diagonal(S)) for k in 1:size(cores[i-1], 3)]..., dims=3)
    end
    
    return cores
end

"""
    tt_add(cores1, cores2)

Add two TT tensors.
"""
function tt_add(cores1::Vector{Array{T,3}}, cores2::Vector{Array{T,3}}) where T<:AbstractFloat
    if length(cores1) != length(cores2)
        error("TT tensors must have same number of cores")
    end
    
    N = length(cores1)
    result_cores = Array{T,3}[]
    
    for i in 1:N
        c1, c2 = cores1[i], cores2[i]
        r1_1, n, r2_1 = size(c1)
        r1_2, n, r2_2 = size(c2)
        
        if i == 1
            # First core: horizontal concatenation
            new_core = cat(c1, c2, dims=3)
        elseif i == N
            # Last core: vertical concatenation
            new_core = cat(c1, c2, dims=1)
        else
            # Middle cores: block diagonal
            new_core = zeros(T, r1_1 + r1_2, n, r2_1 + r2_2)
            new_core[1:r1_1, :, 1:r2_1] = c1
            new_core[(r1_1+1):end, :, (r2_1+1):end] = c2
        end
        
        push!(result_cores, new_core)
    end
    
    return result_cores
end

"""
    tt_dot(cores1, cores2)

Compute dot product of two TT tensors.
"""
function tt_dot(cores1::Vector{Array{T,3}}, cores2::Vector{Array{T,3}}) where T<:AbstractFloat
    if length(cores1) != length(cores2)
        error("TT tensors must have same number of cores")
    end
    
    # Start with scalar 1
    result = ones(T, 1, 1)
    
    for (c1, c2) in zip(cores1, cores2)
        # Contract along physical dimension
        result = dropdims(
            sum(result .* permutedims(c1, (1, 3, 2)) .* c2, dims=(2, 3)),
            dims=(2, 3)
        )
    end
    
    return result[1, 1]
end

"""
    tt_norm(cores)

Compute norm of TT tensor.
"""
function tt_norm(cores::Vector{Array{T,3}}) where T<:AbstractFloat
    return sqrt(tt_dot(cores, cores))
end

"""
Composable Tensor Train decomposition type.
"""
struct TensorTrain{T<:AbstractFloat}
    ranks::Union{Vector{Int},Nothing}
    eps::T
    result::Union{TTResult{T},Nothing}
end

function TensorTrain{T}(; ranks=nothing, eps::T=1e-10) where T<:AbstractFloat
    TensorTrain{T}(ranks, eps, nothing)
end

function fit!(tt::TensorTrain{T}, tensor::AbstractArray{T,N}) where {T<:AbstractFloat,N}
    result = tt_svd(tensor, eps=tt.eps, max_ranks=tt.ranks)
    return TensorTrain{T}(tt.ranks, tt.eps, result)
end

function Base.:+(tt1::TensorTrain{T}, tt2::TensorTrain{T}) where T<:AbstractFloat
    if tt1.result === nothing || tt2.result === nothing
        error("Both TTs must be fitted")
    end
    
    new_cores = tt_add(tt1.result.cores, tt2.result.cores)
    result = TTResult(
        new_cores,
        [size(c, 1) for c in new_cores]...,
        0.0,
        0.0,
        tt1.result.shape
    )
    return TensorTrain{T}(nothing, 1e-10, result)
end

function dot(tt1::TensorTrain{T}, tt2::TensorTrain{T}) where T<:AbstractFloat
    if tt1.result === nothing || tt2.result === nothing
        error("Both TTs must be fitted")
    end
    return tt_dot(tt1.result.cores, tt2.result.cores)
end

function round!(tt::TensorTrain{T}, eps::T=1e-10) where T<:AbstractFloat
    if tt.result === nothing
        error("Must fit first")
    end
    
    new_cores = tt_rounding(tt.result.cores, eps)
    return TensorTrain{T}([size(c, 1) for c in new_cores], eps, tt.result)
end

# Test code
function test_tt()
    Random.seed!(42)
    
    # Create a low-rank tensor
    shape = (4, 5, 6, 7)
    tensor = randn(shape)
    
    # Make it approximately low-rank by TT-SVD and reconstruction
    initial_tt = tt_svd(tensor, eps=1e-2)
    tensor = reconstruct_tt(initial_tt.cores)
    
    # Perform TT decomposition
    result = tt_svd(tensor, eps=1e-6)
    
    println("Tensor Train Decomposition Results:")
    println("  Original shape: $shape")
    println("  TT ranks: $(result.ranks)")
    println("  Reconstruction Error: $(round(result.reconstruction_error, sigdigits=2))")
    println("  Compression Ratio: $(round(result.compression_ratio, digits=2))x")
    
    # Test TT operations
    tt = TensorTrain{Float64}(eps=1e-6)
    tt = fit!(tt, tensor)
    
    # Self dot product
    dot_product = dot(tt, tt)
    println("\n  Self dot product: $(round(dot_product, digits=4))")
    println("  ||T||^2: $(round(sum(tensor.^2), digits=4))")
end

if abspath(PROGRAM_FILE) == @__FILE__
    test_tt()
end
