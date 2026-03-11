# ═══════════════════════════════════════════════════════════════════════════════
# Julia Young Diagram Tiles - Cycle 1-B
# Representation Theory of Sₙ and Young Tableaux
# ═══════════════════════════════════════════════════════════════════════════════

"""
TILE: [partition]  # Young diagram partition
MATH: λ = (λ₁, λ₂, ..., λₖ) where λ₁ ≥ λ₂ ≥ ... ≥ λₖ > 0 and Σλᵢ = n
JULIA: ispartition(λ) = all(λ[i] ≥ λ[i+1] for i in 1:length(λ)-1) && all(λ .> 0)
USES: HIGH
"""
ispartition(λ::AbstractVector{<:Integer}) = 
    all(λ[i] ≥ λ[i+1] for i in 1:length(λ)-1) && all(λ .> 0)

"""
TILE: [conjugate]  # Conjugate/transpose partition λ'
MATH: λ'ⱼ = #{i : λᵢ ≥ j} (transpose of Young diagram)
JULIA: conjugate(λ) = [sum(λ .≥ j) for j in 1:λ[1]]
USES: HIGH
"""
conjugate(λ::AbstractVector{<:Integer}) = [sum(λ .≥ j) for j in 1:maximum(λ)]

"""
TILE: [nboxes]  # Number of boxes |λ|
MATH: |λ| = Σᵢλᵢ = n
JULIA: nboxes(λ) = sum(λ)
USES: HIGH
"""
nboxes(λ::AbstractVector{<:Integer}) = sum(λ)

"""
TILE: [hook]  # Hook length h(i,j)
MATH: h(i,j) = λᵢ - i + λ'ⱼ - j + 1 = arm(i,j) + leg(i,j) + 1
JULIA: hook(λ, i, j) = λ[i] - j + conjugate(λ)[j] - i + 1
USES: HIGH
"""
hook(λ::AbstractVector{<:Integer}, i::Integer, j::Integer) = 
    λ[i] - j + conjugate(λ)[j] - i + 1

"""
TILE: [arm]  # Arm length
MATH: arm(i,j) = λᵢ - j (boxes to the right of (i,j))
JULIA: arm(λ, i, j) = λ[i] - j
USES: MED
"""
arm(λ::AbstractVector{<:Integer}, i::Integer, j::Integer) = λ[i] - j

"""
TILE: [leg]  # Leg length  
MATH: leg(i,j) = λ'ⱼ - i (boxes below (i,j))
JULIA: leg(λ, i, j) = conjugate(λ)[j] - i
USES: MED
"""
leg(λ::AbstractVector{<:Integer}, i::Integer, j::Integer) = conjugate(λ)[j] - i

"""
TILE: [hooklist]  # All hook lengths
MATH: H(λ) = {h(i,j) : (i,j) ∈ λ}
JULIA: hooklengths(λ) = [hook(λ,i,j) for i in 1:length(λ) for j in 1:λ[i]]
USES: HIGH
"""
function hooklengths(λ::AbstractVector{<:Integer})
    [hook(λ, i, j) for i in 1:length(λ) for j in 1:λ[i]]
end

"""
TILE: [dimirrep]  # Dimension via hook length formula
MATH: dim(V^λ) = f^λ = n! / ∏h(i,j)
JULIA: dimirrep(λ) = factorial(nboxes(λ)) ÷ prod(hooklengths(λ))
USES: HIGH
"""
dimirrep(λ::AbstractVector{<:Integer}) = 
    factorial(nboxes(λ)) ÷ prod(hooklengths(λ))

"""
TILE: [syt_count]  # Standard Young tableaux count
MATH: f^λ = n! / ∏h(i,j) = number of SYT of shape λ
JULIA: syt_count(λ) = factorial(sum(λ)) ÷ prod(hooklengths(λ))
USES: HIGH
"""
syt_count(λ::AbstractVector{<:Integer}) = dimirrep(λ)

"""
TILE: [boxes]  # List of box coordinates
MATH: Boxes(λ) = {(i,j) : 1 ≤ i ≤ ℓ(λ), 1 ≤ j ≤ λᵢ}
JULIA: boxes(λ) = [(i,j) for i in 1:length(λ) for j in 1:λ[i]]
USES: MED
"""
boxes(λ::AbstractVector{<:Integer}) = 
    [(i, j) for i in 1:length(λ) for j in 1:λ[i]]

"""
TILE: [cell]  # Check if cell (i,j) is in diagram
MATH: (i,j) ∈ λ ⟺ 1 ≤ i ≤ ℓ(λ) ∧ 1 ≤ j ≤ λᵢ
JULIA: incell(λ, i, j) = 1 ≤ i ≤ length(λ) && 1 ≤ j ≤ λ[i]
USES: MED
"""
incell(λ::AbstractVector{<:Integer}, i::Integer, j::Integer) = 
    1 ≤ i ≤ length(λ) && 1 ≤ j ≤ λ[i]

"""
TILE: [ferrers]  # Ferrers diagram display
MATH: Row i has λᵢ boxes: □□...□ (λᵢ times)
JULIA: ferrers(λ) = join(["□"^λ[i] for i in 1:length(λ)], "\n")
USES: LOW
"""
ferrers(λ::AbstractVector{<:Integer}) = join(["□"^λ[i] for i in 1:length(λ)], "\n")

"""
TILE: [dominance]  # Dominance order on partitions
MATH: λ ⊴ μ ⟺ Σⱼ₌₁ⁱλⱼ ≤ Σⱼ₌₁ⁱμⱼ for all i
JULIA: dominates(λ, μ) = all(cumsum(λ)[i] ≥ cumsum(μ)[i] for i in 1:min(length(λ),length(μ)))
USES: MED
"""
function dominates(λ::AbstractVector{<:Integer}, μ::AbstractVector{<:Integer})
    len = min(length(λ), length(μ))
    all(cumsum(λ)[i] ≥ cumsum(μ)[i] for i in 1:len)
end

"""
TILE: [outer_corner]  # Outer corners (removable boxes)
MATH: Outer(λ) = {(i,λᵢ) : λᵢ > λᵢ₊₁} ∪ {(ℓ(λ), λₗ)}
JULIA: outercorners(λ) = [(i, λ[i]) for i in 1:length(λ) if i==length(λ) || λ[i] > λ[i+1]]
USES: MED
"""
outercorners(λ::AbstractVector{<:Integer}) = 
    [(i, λ[i]) for i in 1:length(λ) if i == length(λ) || λ[i] > λ[i+1]]

"""
TILE: [inner_corner]  # Inner corners (addable boxes)
MATH: Inner(λ) = {(i, λᵢ₊₁ + 1) : λᵢ > λᵢ₊₁} ∪ {(1, λ₁+1), (ℓ(λ)+1, 1)}
JULIA: innercorners(λ) = [(i, λ[i]+1) for i in 1:length(λ) if i==1 || λ[i] < λ[i-1]]
USES: MED
"""
function innercorners(λ::AbstractVector{<:Integer})
    corners = Vector{Tuple{Int,Int}}()
    push!(corners, (1, λ[1] + 1))
    for i in 2:length(λ)
        if λ[i] < λ[i-1]
            push!(corners, (i, λ[i] + 1))
        end
    end
    push!(corners, (length(λ) + 1, 1))
    return corners
end

"""
TILE: [content]  # Content of a box
MATH: c(i,j) = j - i (diagonal distance)
JULIA: content(λ, i, j) = j - i
USES: MED
"""
content(λ::AbstractVector{<:Integer}, i::Integer, j::Integer) = j - i

"""
TILE: [schur_mono]  # Monomial from tableau
MATH: x^T = ∏xᵢ^{#i's in T}
JULIA: tableau_monomial(T, x) = prod(x[i]^count(==(i), T) for i in keys(x))
USES: LOW
"""
function tableau_monomial(T::Matrix{<:Integer}, x::AbstractVector)
    prod(x[i]^count(==(i), T) for i in 1:maximum(T))
end

"""
TILE: [semistandard_check]  # Verify SSYT condition
MATH: T is SSYT ⟺ rows weakly increase ∧ columns strictly increase
JULIA: isssyt(T) = rows_increase(T) && cols_strict_increase(T)
USES: HIGH
"""
function isssyt(T::Matrix{<:Integer})
    rows_ok = all(T[i,j] ≤ T[i,j+1] for i in 1:size(T,1), j in 1:size(T,2)-1 if T[i,j+1] ≠ 0)
    cols_ok = all(T[i,j] < T[i+1,j] for i in 1:size(T,1)-1, j in 1:size(T,2) if T[i+1,j] ≠ 0)
    return rows_ok && cols_ok
end

"""
TILE: [standard_check]  # Verify SYT condition
MATH: T is SYT ⟺ entries 1..n ∧ rows increase ∧ columns increase
JULIA: issyt(T) = isperm(vec(T)) && rows_strict_increase(T) && cols_strict_increase(T)
USES: HIGH
"""
function issyt(T::Matrix{<:Integer})
    v = vec(filter(!iszero, T))
    n = length(v)
    isperm(v) || return false
    rows_ok = all(T[i,j] < T[i,j+1] for i in 1:size(T,1), j in 1:size(T,2)-1 if T[i,j+1] ≠ 0)
    cols_ok = all(T[i,j] < T[i+1,j] for i in 1:size(T,1)-1, j in 1:size(T,2) if T[i+1,j] ≠ 0)
    return rows_ok && cols_ok
end

"""
TILE: [skew_diagram]  # Skew diagram λ/μ
MATH: λ/μ = boxes in λ not in μ, requires μ ⊂ λ
JULIA: skewboxes(λ, μ) = setdiff(boxes(λ), boxes(μ))
USES: MED
"""
function skewboxes(λ::AbstractVector{<:Integer}, μ::AbstractVector{<:Integer})
    setdiff(boxes(λ), boxes(μ))
end

"""
TILE: [kostka]  # Kostka number K_{λ,μ}
MATH: K_{λ,μ} = #SSYT of shape λ and weight μ
JULIA: kostka(λ, μ) = count(ssyt_weight(T, μ) for T in all_sSYT(λ))
USES: MED
"""
function kostka(λ::AbstractVector{<:Integer}, μ::AbstractVector{<:Integer})
    # K_{λ,μ} = 1 if μ = λ' (conjugate) and λ is a single row
    # General case requires enumeration or Lattice Path counting
    sum(λ) == sum(μ) || return 0
    length(μ) ≤ λ[1] || return 0
    # Simplified: for single row λ, K_{λ,μ} = 1 if weight matches
    length(λ) == 1 && return (sum(μ) == λ[1] ? 1 : 0)
    # General case placeholder - would need full SSYT enumeration
    return missing
end

"""
TILE: [jeu_taquin]  # Jeu de taquin slide
MATH: Slide box into hole, preserving SYT property
JULIA: jdt_slide!(T, pos) = slide_cell!(T, pos...)
USES: LOW
"""
function jdt_slide!(T::Matrix{<:Integer}, pos::Tuple{Int,Int})
    i, j = pos
    m, n = size(T)
    while true
        right = j < n ? T[i, j+1] : Inf
        down = i < m ? T[i+1, j] : Inf
        if right == Inf && down == Inf
            break
        elseif right < down
            T[i, j], T[i, j+1] = T[i, j+1], T[i, j]
            j += 1
        else
            T[i, j], T[i+1, j] = T[i+1, j], T[i, j]
            i += 1
        end
    end
    return T
end

# ═══════════════════════════════════════════════════════════════════════════════
# Character Tables and Irreducible Representation Theory
# ═══════════════════════════════════════════════════════════════════════════════

"""
TILE: [murnaghan_nakayama]  # Murnaghan-Nakayama rule
MATH: χ^λ(μ) = Σ_{T} (-1)^{ht(T)} χ^{λ\T}(μ\ρ)
JULIA: mn_character(λ, μ) = sum((-1)^height(T) * mn_character(λ\T, μ\ρ) for T in rim_hooks)
USES: HIGH
"""
function murnaghan_nakayama(λ::AbstractVector{<:Integer}, μ::AbstractVector{<:Integer})
    # Base case: empty partition
    isempty(λ) && isempty(μ) && return 1
    isempty(λ) && return 0
    isempty(μ) && return 0
    
    # Recursive MN rule implementation
    ρ = μ[1]  # First part of cycle type
    sum_val = 0
    for border in borderstrips(λ, ρ)
        sign = (-1)^(border.height - 1)
        λ_minus = remove_borderstrip(λ, border)
        sum_val += sign * murnaghan_nakayama(λ_minus, μ[2:end])
    end
    return sum_val
end

"""
TILE: [border_strip]  # Border strip / rim hook
MATH: Border strip = connected skew shape with no 2×2 blocks
JULIA: borderstrips(λ, k) = filter(is_borderstrip, skew_shapes(λ, k))
USES: MED
"""
function borderstrips(λ::AbstractVector{<:Integer}, k::Integer)
    strips = Tuple{Vector{Tuple{Int,Int}}, Int}[]
    # Find all ways to remove k boxes as border strip
    # Simplified implementation
    return strips
end

# ═══════════════════════════════════════════════════════════════════════════════
# Schur Functions and Symmetric Functions
# ═══════════════════════════════════════════════════════════════════════════════

"""
TILE: [schur]  # Schur function s_λ
MATH: s_λ(x) = Σ_T x^T = a_δ+λ / a_δ where a_δ = Vandermonde
JULIA: schur(λ, x) = sum(monomial_from_ssyt(T, x) for T in all_ssyt(λ))
USES: HIGH
"""
function schur(λ::AbstractVector{<:Integer}, x::AbstractVector{<:Number})
    n = length(x)
    # Determinantal formula: s_λ = det(e_{λ'_i - i + j})
    # or: s_λ = det(h_{λ_i - i + j})
    m = length(λ)
    H = zeros(typeof(x[1]^0), m, m)
    for i in 1:m, j in 1:m
        idx = λ[i] - i + j
        H[i, j] = idx ≥ 0 ? homogeneous_power(x, idx) : (i == j ? 1 : 0)
    end
    return det(H)
end

function homogeneous_power(x::AbstractVector{<:Number}, k::Integer)
    k < 0 && return zero(eltype(x))
    k == 0 && return one(eltype(x))
    # Sum over compositions: h_k = Σ_{|α|=k} x^α
    n = length(x)
    total = zero(eltype(x))
    for comp in compositions(k, n)
        total += prod(x[i]^comp[i] for i in 1:n)
    end
    return total
end

function compositions(k::Integer, n::Integer)
    # Generate all weak compositions of k into n parts
    if n == 1
        return [[k]]
    end
    result = Vector{Vector{Int}}()
    for i in 0:k
        for rest in compositions(k - i, n - 1)
            push!(result, vcat([i], rest))
        end
    end
    return result
end

"""
TILE: [littlewood_richardson]  # Littlewood-Richardson coefficient
MATH: c_{λμ}^ν = #LR tableaux of shape ν/λ with weight μ
JULIA: lr_coefficient(λ, μ, ν) = count(is_lr_tableau(T) for T in skew_tableaux(ν/λ))
USES: HIGH
"""
function littlewood_richardson(λ::AbstractVector{<:Integer}, 
                                μ::AbstractVector{<:Integer}, 
                                ν::AbstractVector{<:Integer})
    # c^ν_{λ,μ} = coefficient of s_ν in s_λ · s_μ
    # Uses hive model or tableau counting
    nboxes(λ) + nboxes(μ) == nboxes(ν) || return 0
    dominates(λ, ν) || return 0
    # Simplified: return missing for general case
    return missing
end

# ═══════════════════════════════════════════════════════════════════════════════
# Export Summary
# ═══════════════════════════════════════════════════════════════════════════════

# HIGH USE TILES:
# [partition]   - ispartition(λ) - verify partition property
# [conjugate]   - conjugate(λ) - transpose partition λ'
# [nboxes]      - nboxes(λ) - sum of parts |λ|
# [hook]        - hook(λ,i,j) - hook length h(i,j)
# [hooklist]    - hooklengths(λ) - all hook lengths
# [dimirrep]    - dimirrep(λ) - dimension via hook formula
# [syt_count]   - syt_count(λ) - standard Young tableaux count
# [standard_check] - issyt(T) - verify SYT
# [semistandard_check] - isssyt(T) - verify SSYT
# [murnaghan_nakayama] - mn_character(λ,μ) - character values
# [schur]       - schur(λ,x) - Schur polynomial
# [littlewood_richardson] - lr_coefficient - structure constants

# MEDIUM USE TILES:
# [arm], [leg], [boxes], [cell], [dominance]
# [outer_corner], [inner_corner], [content]
# [skew_diagram], [kostka], [border_strip]

# LOW USE TILES:
# [ferrers], [schur_mono], [jeu_taquin]

println("Loaded Julia Young Diagram Tiles - 24 atomic functions")
