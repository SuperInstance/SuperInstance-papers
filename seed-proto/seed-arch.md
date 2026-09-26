# The Complete Solution

## The Constraint

Three things must hold everywhere. If any fails, the system is broken.

**Bit-exact.** Same inputs produce identical outputs on every substrate. No exceptions. Q32 fixed-point only. No floats in any hot path.

**Reversible.** Every transition has an inverse. Every event records enough state to undo it. The seed is recoverable from any descendant by inverting the journal.

**Composable.** Tokens glue along shared boundaries. Shapes close. Instances compose into fields. The same operations work at every scale.

Everything below serves these three constraints.

---

## The Workspace

Eleven crates. Each has one job. Dependencies flow upward, never sideways.

```
platonic/
├── Cargo.toml                    # workspace root
├── crates/
│   ├── q32/                      # deterministic fixed-point arithmetic
│   ├── core/                     # bit, point, line, triangle, invariant, token
│   ├── compose/                  # sheaf, shape, cohomology
│   ├── arch/                     # elastica, gate, decision
│   ├── life/                     # egg, nursery, shell, break
│   ├── journal/                  # event sourcing, reversibility, git
│   ├── compute/                  # hardware abstraction (wgpu + rayon)
│   ├── field/                    # instance, delta, rendering
│   ├── oracle/                   # JEV and other measurement devices
│   ├── net/                      # network transport
│   └── wasm/                     # browser bundle
├── kernels/                      # WGSL compute shaders
├── apps/
│   ├── cli/                      # command-line runner
│   ├── server/                   # field host
│   └── edge/                     # no_std embedded runner
└── tests/
    ├── determinism/              # bit-exact cross-substrate tests
    ├── reversibility/            # journal inversion tests
    └── composition/              # sheaf and closure tests
```

---

## The Core Types

These are the atoms. Every other type composes from these.

```rust
// crates/q32/src/lib.rs

/// Deterministic fixed-point. i64 / 2^32.
/// Range: ±2^31. Precision: 2^-32.
/// No floats anywhere in the compute path.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[repr(transparent)]
pub struct Q32(i64);

impl Q32 {
    pub const ZERO: Q32 = Q32(0);
    pub const ONE:  Q32 = Q32(1 << 32);
    pub const HALF: Q32 = Q32(1 << 31);
    pub const LOG2_3: Q32 = Q32(6_806_210_843); // log2(3) * 2^32

    #[inline] pub const fn raw(self) -> i64 { self.0 }
    #[inline] pub const fn from_raw(x: i64) -> Self { Q32(x) }
    #[inline] pub const fn saturating_add(self, o: Q32) -> Q32 { Q32(self.0.saturating_add(o.0)) }
    #[inline] pub const fn saturating_sub(self, o: Q32) -> Q32 { Q32(self.0.saturating_sub(o.0)) }
    #[inline] pub const fn checked_mul(self, o: Q32) -> Option<Q32> {
        match (self.0 as i128).checked_mul(o.0 as i128) {
            Some(p) => Some(Q32((p >> 32) as i64)),
            None => None,
        }
    }
    #[inline] pub const fn checked_div(self, o: Q32) -> Option<Q32> {
        if o.0 == 0 { return None; }
        Some(Q32((((self.0 as i128) << 32) / o.0 as i128) as i64))
    }
    pub fn sqrt(self) -> Q32 { /* Newton, 32 iters, bit-exact */ }
    pub fn abs(self) -> Q32 { Q32(self.0.abs()) }
}
```

```rust
// crates/core/src/bit.rs

pub const BIT_ZERO: Q32 = Q32::ZERO;
pub const BIT_ONE:  Q32 = Q32::ONE;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Point { pub bit: Q32, pub id: u64 }

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Line { pub a: Point, pub b: Point }

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Triangle { pub ab: Line, pub bc: Line, pub ca: Line }

impl Triangle {
    /// Closure: the boundary sum vanishes.
    #[inline] pub fn is_closed(&self) -> bool {
        self.ab.a.bit + self.ab.b.bit
      + self.bc.a.bit + self.bc.b.bit
      + self.ca.a.bit + self.ca.b.bit == Q32::ZERO
    }
}
```

```rust
// crates/core/src/invariant.rs

/// The finite platonic vocabulary. Five solids in 3D. Dozens of invariants.
/// Enumerated, not learned. Discovered from binary closure, not from data.
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum Invariant {
    // From the cube
    Pyth345       = 0,
    SquareDiag    = 1,
    // From the tetrahedron
    Tetrahedral   = 2,
    // From the octahedron
    Octahedral    = 3,
    // From the dodecahedron
    GoldenRatio   = 4,
    // From the icosahedron
    Icosahedral   = 5,
    // Extensions (still finite, still enumerated)
    Simplex4      = 6,
    Hypercube4    = 7,
    Cross4        = 8,
    Cell24        = 9,
    Cell120       = 10,
    Cell600       = 11,
}

impl Invariant {
    /// Representation dimension.
    #[inline] pub const fn dim(self) -> u8 {
        match self {
            Self::Pyth345 | Self::SquareDiag | Self::GoldenRatio
            | Self::Octahedral | Self::Icosahedral => 3,
            Self::Tetrahedral => 4,
            Self::Simplex4 | Self::Hypercube4 | Self::Cross4
            | Self::Cell24 | Self::Cell120 | Self::Cell600 => 4,
        }
    }
    /// Symmetry group order.
    #[inline] pub const fn symmetry(self) -> u32 {
        match self {
            Self::Pyth345 | Self::SquareDiag | Self::GoldenRatio => 2,
            Self::Tetrahedral => 24,
            Self::Octahedral => 48,
            Self::Icosahedral => 120,
            Self::Simplex4 => 120,
            Self::Hypercube4 => 384,
            Self::Cross4 => 384,
            Self::Cell24 => 1152,
            Self::Cell120 => 14400,
            Self::Cell600 => 14400,
        }
    }
    /// Cost in qutrit bits.
    #[inline] pub const fn cost(self) -> Q32 {
        // log2(dim) * symmetry_penalty, all precomputed.
        // Values are constants, not computed.
        match self {
            Self::Pyth345 => Q32::ONE,
            Self::SquareDiag => Q32::ONE,
            Self::GoldenRatio => Q32::ONE,
            Self::Tetrahedral => Q32::from_raw(2 << 32),
            Self::Octahedral => Q32::from_raw(2 << 32),
            Self::Icosahedral => Q32::from_raw(3 << 32),
            _ => Q32::from_raw(4 << 32),
        }
    }
    pub const ALL: [Invariant; 12] = [
        Self::Pyth345, Self::SquareDiag, Self::Tetrahedral, Self::Octahedral,
        Self::GoldenRatio, Self::Icosahedral, Self::Simplex4, Self::Hypercube4,
        Self::Cross4, Self::Cell24, Self::Cell120, Self::Cell600,
    ];
}
```

```rust
// crates/core/src/token.rs

/// A token: granular instantiation of an invariant.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct Token {
    pub id:         u64,
    pub invariant:  Invariant,
    pub boundary:   Vec<u64>,       // boundary point ids
    pub curvature:  Q32,
    pub orientation: [Q32; 3],
    pub scale:      Q32,
}

impl Token {
    /// Platonic recognition: same invariant means same relation.
    #[inline] pub fn recognizes(&self, o: &Token) -> bool {
        self.invariant == o.invariant
    }
    /// Shared boundary: can glue if they share points.
    #[inline] pub fn shares(&self, o: &Token) -> bool {
        self.boundary.iter().any(|p| o.boundary.contains(p))
    }
    /// Energy: curvature squared + boundary size.
    #[inline] pub fn energy(&self) -> Q32 {
        self.curvature.checked_mul(self.curvature).unwrap_or(Q32::ZERO)
            .saturating_add(Q32::from_raw((self.boundary.len() as i64) << 32))
    }
}
```

---

## The Kernels

The compute runs on GPUs via WGSL. Every kernel is a pure function over Q32 buffers. No floats. No randomness. Deterministic by construction.

```wgsl
// kernels/q32.wgsl — the fixed-point arithmetic primitives

struct Q32 { v: i64 };

fn q32_mul(a: Q32, b: Q32) -> Q32 {
    // (a.v * b.v) >> 32, using i128 emulation via two i64 halves.
    // This is the critical operation. It must be bit-exact everywhere.
    let a_hi = a.v >> 32;
    let a_lo = a.v & 0xFFFFFFFF;
    let b_hi = b.v >> 32;
    let b_lo = b.v & 0xFFFFFFFF;
    let lo_lo = a_lo * b_lo;
    let lo_hi = a_lo * b_hi;
    let hi_lo = a_hi * b_lo;
    let mid = (lo_lo >> 32) + (lo_hi & 0xFFFFFFFF) + (hi_lo & 0xFFFFFFFF);
    return Q32((hi_lo >> 32) + (lo_hi >> 32) + (mid >> 32));
}

fn q32_add(a: Q32, b: Q32) -> Q32 { return Q32(a.v + b.v); }
fn q32_sub(a: Q32, b: Q32) -> Q32 { return Q32(a.v - b.v); }
fn q32_abs(a: Q32) -> Q32 { return Q32(abs(a.v)); }
fn q32_zero() -> Q32 { return Q32(0i64); }
fn q32_one() -> Q32 { return Q32(0x100000000i64); }
```

```wgsl
// kernels/compose.wgsl — token gluing and sheaf cocycle check

struct Token {
    id: u32,
    invariant: u32,
    boundary_offset: u32,
    boundary_count: u32,
    curvature: i64,
    orientation: vec3<i64>,
    scale: i64,
};

struct GlueResult {
    glued: u32,          // 1 if glued, 0 if not
    new_boundary_offset: u32,
    new_boundary_count: u32,
};

@group(0) @binding(0) var<storage, read>       tokens: array<Token>;
@group(0) @binding(1) var<storage, read>       boundaries: array<u32>;
@group(0) @binding(2) var<storage, read_write> results: array<GlueResult>;

@compute @workgroup_size(64)
fn glue_pairs(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&tokens);
    if (i >= n) { return; }
    let t = tokens[i];
    // Compare with each other token.
    for (var j: u32 = i + 1u; j < n; j = j + 1u) {
        let o = tokens[j];
        // Platonic recognition: same invariant.
        if (t.invariant != o.invariant) { continue; }
        // Boundary intersection: any shared point?
        var shared: u32 = 0u;
        for (var a: u32 = 0u; a < t.boundary_count; a = a + 1u) {
            let pa = boundaries[t.boundary_offset + a];
            for (var b: u32 = 0u; b < o.boundary_count; b = b + 1u) {
                if (pa == boundaries[o.boundary_offset + b]) { shared = 1u; break; }
            }
            if (shared == 1u) { break; }
        }
        if (shared == 1u) {
            // Glue: union of boundaries.
            results[i].glued = 1u;
            results[i].new_boundary_offset = t.boundary_offset;
            results[i].new_boundary_count = t.boundary_count + o.boundary_count;
        }
    }
}
```

```wgsl
// kernels/arch.wgsl — elastica solver

struct Point { x: i64, y: i64, z: i64 };
struct ArchPoint { p: Point, kappa: i64, f: i64 };

@group(0) @binding(0) var<storage, read_write> arch: array<ArchPoint>;
@group(0) @binding(1) var<uniform> params: ArchParams;

struct ArchParams {
    n: u32,
    iterations: u32,
    dt: i64,
};

@compute @workgroup_size(64)
fn solve_elastica(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = params.n;
    if (i == 0u || i >= n - 1u) { return; }
    // κ'' + ½κ³ - f' = 0, solved by iterative Euler step.
    for (var it: u32 = 0u; it < params.iterations; it = it + 1u) {
        let k_prev = arch[i - 1u].kappa;
        let k_next = arch[i + 1u].kappa;
        let k_curr = arch[i].kappa;
        let f_prev = arch[i - 1u].f;
        let f_next = arch[i + 1u].f;
        // f' via central difference.
        let f_prime = (f_next - f_prev) / 2i64;
        // κ_new = (κ_prev + κ_next)/2 - ½κ³ + f'
        let half_k3 = q32_mul(q32_mul(Q32(k_curr), Q32(k_curr)), Q32(k_curr)) / 2i64;
        let k_new = ((k_prev + k_next) / 2i64) - half_k3 + f_prime;
        arch[i].kappa = k_new;
    }
}
```

```wgsl
// kernels/correlation.wgsl — delta correlation for the renderer

struct Delta { from: u32, tick: u32, stage: i64, velocity: i64 };

@group(0) @binding(0) var<storage, read>       deltas: array<Delta>;
@group(0) @binding(1) var<storage, read_write> corr:   array<i64>;
@group(0) @binding(2) var<uniform>             dims:   CorrDims;

struct CorrDims { n_instances: u32, n_ticks: u32, stride: u32 };

@compute @workgroup_size(16, 16)
fn correlate(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let j = gid.y;
    if (i >= dims.n_instances || j >= dims.n_instances || i >= j) { return; }
    var sum_ij: i64 = 0i64;
    var sum_ii: i64 = 0i64;
    var sum_jj: i64 = 0i64;
    for (var t: u32 = 0u; t < dims.n_ticks; t = t + 1u) {
        let a = deltas[i * dims.stride + t].stage;
        let b = deltas[j * dims.stride + t].stage;
        sum_ij += a * b;
        sum_ii += a * a;
        sum_jj += b * b;
    }
    if (sum_ii == 0i64 || sum_jj == 0i64) { corr[i * dims.n_instances + j] = 0i64; return; }
    // Integer-scaled correlation: sum_ij / sqrt(sum_ii * sum_jj), scaled to Q32.
    let denom = q32_sqrt(q32_mul(Q32(sum_ii), Q32(sum_jj)));
    corr[i * dims.n_instances + j] = q32_div(Q32(sum_ij), denom).v;
}
```

---

## The Compute Substrate

The same kernels run everywhere. The dispatcher chooses the backend based on the problem size and the available hardware.

```rust
// crates/compute/src/lib.rs

use wgpu;
use rayon::prelude::*;

pub enum Backend {
    CpuScalar,
    CpuSimd,
    Gpu(wgpu::Device, wgpu::Queue),
    Wasm,                     // compiled path for browser
    Embedded,                 // no_std path for microcontrollers
}

pub struct Dispatcher {
    backend: Backend,
    /// Empirically learned thresholds. Below this, use CPU. Above, use GPU.
    thresholds: Thresholds,
}

pub struct Thresholds {
    pub compose_glue:    u32,   // number of tokens
    pub arch_points:     u32,   // number of arch samples
    pub correlation:     u32,   // number of instance pairs
}

impl Dispatcher {
    /// Choose the backend for a given operation and problem size.
    pub fn dispatch(&self, op: Op, size: u32) -> BackendChoice {
        match (&self.backend, op) {
            (Backend::Gpu(..), Op::ComposeGlue)   if size > self.thresholds.compose_glue   => BackendChoice::Gpu,
            (Backend::Gpu(..), Op::SolveElastica) if size > self.thresholds.arch_points    => BackendChoice::Gpu,
            (Backend::Gpu(..), Op::Correlate)     if size > self.thresholds.correlation    => BackendChoice::Gpu,
            (Backend::CpuSimd, _)                                                            => BackendChoice::CpuSimd,
            _                                                                                => BackendChoice::CpuScalar,
        }
    }

    /// Run a kernel. The API is identical for CPU and GPU.
    pub fn run<K: Kernel>(&self, kernel: K, input: K::Input) -> K::Output {
        match self.dispatch(kernel.op(), kernel.size(&input)) {
            BackendChoice::Gpu      => kernel.run_gpu(input),
            BackendChoice::CpuSimd  => kernel.run_simd(input),
            BackendChoice::CpuScalar => kernel.run_scalar(input),
        }
    }
}

/// Every kernel implements this trait. The trait is the universal contract.
pub trait Kernel {
    type Input;
    type Output;
    fn op(&self) -> Op;
    fn size(&self, input: &Self::Input) -> u32;
    fn run_gpu(&self, input: Self::Input) -> Self::Output;
    fn run_simd(&self, input: Self::Input) -> Self::Output;
    fn run_scalar(&self, input: Self::Input) -> Self::Output;
}
```

**The build matrix.** One source, six targets, all bit-identical.

| Target | Backend | Compile Flag | Output |
|---|---|---|---|
| x86_64 Linux | CPU SIMD | default | Native |
| x86_64 Windows | CPU SIMD | default | Native |
| aarch64 Linux | CPU SIMD | default | Native |
| aarch64 macOS | GPU (Metal via wgpu) | `--features gpu` | Native |
| x86_64 NVIDIA | GPU (Vulkan via wgpu) | `--features gpu` | Native |
| wasm32 | WebGPU + WASM SIMD | `--target wasm32` | Browser |
| thumbv7em | no_std scalar | `--no-default-features` | Embedded |

The Q32 type guarantees bit-identical results across all six. The build system runs the same test suite against every target.

---

## The Journal

Every event is signed, reversible, and stored in git.

```rust
// crates/journal/src/lib.rs

#[derive(Clone, Serialize, Deserialize)]
pub struct Event {
    pub id:        [u8; 16],       // UUID v4
    pub parent:    Option<[u8; 16]>,
    pub tick:      u64,
    pub kind:      EventKind,
    pub before:    [u8; 32],       // BLAKE3 of pre-state
    pub after:     [u8; 32],       // BLAKE3 of post-state
    pub payload:   Vec<u8>,        // operation-specific data
    pub inverse:   Vec<u8>,        // enough to undo
    pub signature: [u8; 64],       // Ed25519 over the entire event
}

#[derive(Clone, Serialize, Deserialize)]
pub enum EventKind {
    TokenAdd     { token: Token },
    TokenRemove  { token_id: u64 },
    BoundarySet  { token_id: u64, boundary: Vec<u64> },
    CurvatureSet { token_id: u64, curvature: Q32 },
    ShapeClose   { shape_id: u64 },
    ShapeOpen    { shape_id: u64 },
    EggForm      { shape_id: u64, shell: Vec<u64> },
    ShellBreak   { egg_id: u64 },
    Delta        { from: u64, gamma: Q32, eta: Q32 },
    Tick         { clock: u64 },
}

pub struct Journal {
    pub branch:      [u8; 16],
    pub parent:      Option<[u8; 16]>,
    pub fork_point:  Option<[u8; 16]>,
    pub events:      Vec<Event>,
    pub head:        Option<[u8; 16]>,
}

impl Journal {
    /// Append an event. Verify the invariants before committing.
    pub fn append(&mut self, e: Event) -> Result<(), JournalError> {
        // Verify signature.
        verify_signature(&e)?;
        // Verify parent.
        if let Some(p) = e.parent {
            if Some(p) != self.head { return Err(JournalError::BrokenChain); }
        }
        // Verify reversibility: apply then invert must return to before.
        let state_after = apply(&e)?;
        let state_before = invert(&e, &state_after)?;
        if hash(&state_before) != e.before { return Err(JournalError::NotReversible); }
        self.head = Some(e.id);
        self.events.push(e);
        Ok(())
    }

    /// Reverse-actualize to any point in the journal.
    pub fn rewind_to(&self, target: [u8; 16]) -> Result<State, JournalError> {
        let mut state = self.replay()?;
        for e in self.events_after(target).iter().rev() {
            state = invert(e, &state)?;
        }
        Ok(state)
    }

    /// Fork at any point.
    pub fn fork(&self, at: [u8; 16]) -> Journal { /* ... */ }

    /// Commit the journal to git. One commit per developmental stage.
    pub fn commit(&self, message: &str) -> Result<git2::Oid, git2::Error> {
        let repo = git2::Repository::open(&self.path)?;
        let mut index = repo.index()?;
        write_journal_to_disk(&self, &self.path)?;
        index.add_path(Path::new("journal.json"))?;
        index.write()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;
        let sig = git2::Signature::now("platonic", "platonic@localhost")?;
        let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
        let parents: Vec<&git2::Commit> = parent.iter().collect();
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
    }
}
```

**Storage tiers.**

| Tier | Medium | Contents | Retention |
|---|---|---|---|
| Hot | NVMe | Last 10^6 events, active branches | Always |
| Warm | SSD | Last 10^9 events, all branches | 30 days |
| Cold | Object store | All events, all branches | Forever |
| Fossil | Tape / glacier | Archived lineages | Forever |

Git is the interface. Object storage is the backend. The journal is append-only. Nothing is ever deleted.

---

## The Field

Instances are autonomous. They broadcast deltas. They never coordinate directly. The field emerges.

```rust
// crates/field/src/lib.rs

#[derive(Clone, Serialize, Deserialize)]
pub struct Delta {
    pub from:      [u8; 16],
    pub tick:      u64,
    pub gamma:     Q32,
    pub eta:       Q32,
    pub stage:     Q32,
    pub velocity:  Q32,
    pub signature: [u8; 64],
}

pub struct Instance {
    pub id:            [u8; 16],
    pub shape:         Shape,
    pub journal:       Journal,
    pub oracle:        Box<dyn Oracle>,
    pub conservation:  Conservation,
    pub ledger:        Ledger,
    pub peers:         HashMap<[u8; 16], Reputation>,
}

impl Instance {
    /// One tick. Measure, decide, act, record, broadcast.
    pub fn tick(&mut self) -> Delta {
        // 1. Measure.
        let answers = self.oracle.evaluate(&self.shape, &standard_questions());

        // 2. Decide.
        let action = decide(&self.shape, &answers);

        // 3. Act.
        let event = self.shape.act(action);

        // 4. Record.
        self.journal.append(event).expect("journal write");

        // 5. Update ledger.
        self.ledger.commit(&self.shape);

        // 6. Check conservation.
        assert!(self.conservation.check(&self.shape).holds());

        // 7. Broadcast.
        Delta {
            from: self.id,
            tick: self.journal.events.len() as u64,
            gamma: self.ledger.gamma,
            eta: self.ledger.eta,
            stage: self.shape.stage,
            velocity: self.shape.velocity,
            signature: sign(&self.id, &self.journal.head.unwrap()),
        }
    }
}

/// The field is a set of instances. It has no center.
pub struct Field {
    pub instances: HashMap<[u8; 16], Instance>,
    pub transport: Box<dyn Transport>,
}

impl Field {
    /// One step of the whole field. Every instance ticks, then all deltas broadcast.
    pub fn step(&mut self) {
        let deltas: Vec<Delta> = self.instances.values_mut()
            .map(|i| i.tick())
            .collect();
        for d in &deltas {
            self.transport.broadcast(d);
        }
        for (id, inst) in self.instances.iter_mut() {
            for d in &deltas {
                if d.from != *id { inst.receive(d); }
            }
        }
    }
}
```

---

## The Network

Deltas travel over three transports, chosen by the network topology.

```rust
// crates/net/src/lib.rs

#[async_trait]
pub trait Transport: Send + Sync {
    async fn broadcast(&self, delta: &Delta);
    async fn subscribe(&self, id: [u8; 16]) -> BoxStream<'static, Delta>;
}

/// gRPC over HTTP/2. Reliable, ordered, for datacenter fields.
pub struct GrpcTransport { /* ... */ }

/// WebSocket. For browser instances and cross-origin fields.
pub struct WebSocketTransport { /* ... */ }

/// UDP multicast. For local clusters and low-latency fields.
pub struct UdpMulticastTransport { /* ... */ }

/// libp2p. For peer-to-peer fields with no central server.
pub struct LibP2pTransport { /* ... */ }
```

The wire format is `bincode`-encoded `Delta`. Every delta is signed. Every receiver verifies. No receiver trusts any sender without verification.

---

## The Oracle

JEV and any other calibrated decision model implements the same trait.

```rust
// crates/oracle/src/lib.rs

pub enum Question {
    Choice { instructions: String, options: Vec<String> },
    Noul   { instructions: String },
    Score  { instructions: String, scale: Vec<String> },
}

pub struct Answer {
    pub probabilities: HashMap<String, Q32>,
    pub confidence:    Q32,
}

pub trait Oracle: Send + Sync {
    fn evaluate(
        &self,
        state: &Shape,
        questions: &HashMap<String, Question>,
    ) -> Result<HashMap<String, Answer>, OracleError>;
}

/// The JEV implementation. HTTP client. Cached. Deterministic.
pub struct JevOracle {
    client: reqwest::Client,
    cache:  Mutex<LruCache<[u8; 32], HashMap<String, Answer>>>,
}

impl Oracle for JevOracle {
    fn evaluate(&self, state: &Shape, questions: &HashMap<String, Question>)
        -> Result<HashMap<String, Answer>, OracleError>
    {
        let key = hash(state, questions);
        if let Some(cached) = self.cache.lock().unwrap().get(&key) {
            return Ok(cached.clone());
        }
        let response = self.client.post("https://api.typesafe.ai/jev")
            .json(&build_request(state, questions))
            .send()?;
        let answers: HashMap<String, Answer> = response.json()?;
        self.cache.lock().unwrap().put(key, answers.clone());
        Ok(answers)
    }
}
```

Determinism requires caching. The same state always returns the same answers. JEV is deterministic given the same input. The cache guarantees it at the system level.

---

## The Deployment

One command builds everything. One command deploys to any target.

```bash
# Build all targets
platonic build --all

# Deploy to a specific device
platonic deploy --target jetson-orin --binary edge-agent
platonic deploy --target browser --binary wasm-agent
platonic deploy --target datacenter --binary field-host

# Run a field
platonic field start --config field.toml

# Inspect a lineage
platonic journal log <branch-id>
platonic journal rewind <event-id>
platonic journal fork <event-id> --name new-branch
```

`field.toml`:

```toml
[field]
id = "medical-instrument-field"
conservation_budget = 1.585
oracle = "jev"

[transport]
kind = "grpc"
listen = "0.0.0.0:50051"

[storage]
hot = "/var/lib/platonic/hot"
warm = "/var/lib/platonic/warm"
cold = "s3://platonic-cold/medical-instrument/"

[instances]
seed = "seeds/medical-instrument.seed.json"
max_instances = 10000
```

---

## The Invariants

The system is correct when these hold. Every build verifies them. Every deployment verifies them. Every tick verifies them.

**I1. Bit-exactness.** Same inputs produce identical outputs on every substrate.

```
∀ target ∈ {x86, arm, wasm, cuda, metal, vulkan}:
    run(kernel, input)_target == run(kernel, input)_reference
```

**I2. Reversibility.** Every event has an inverse. The inverse restores the pre-state exactly.

```
∀ e ∈ journal:
    invert(e, apply(e, s)) == s
```

**I3. Closure.** A shape exists iff its first cohomology vanishes.

```
shape.exists() ⟺ H¹(shape, sheaf) == 0
```

**I4. Conservation.** Every transition satisfies the qutrit bound.

```
∀ t: γ(t) + η(t) ≤ log₂(3)
```

**I5. Composition.** Tokens glue along shared boundaries. The cocycle condition holds.

```
∀ U, V: t_U|_{U∩V} == t_V|_{U∩V}
```

**I6. Determinism of the oracle.** The same state produces the same answers.

```
∀ s, q: oracle(s, q) == oracle(s, q)  (with cache)
```

**I7. Signature validity.** Every delta is signed. Every receiver verifies.

```
∀ d ∈ deltas: verify(d.signature, d) == true
```

**I8. Liveness.** At least one instance ticks per logical second.

```
∀ window of 1s: ∃ tick
```

**I9. Forkability.** Any journal can be forked at any event.

```
∀ j, e ∈ j: fork(j, e) is a valid journal
```

**I10. Substrate independence.** The same journal produces the same lineage on every substrate.

```
∀ target: replay(journal)_target == replay(journal)_reference
```

If any invariant fails, the build fails. If any invariant fails at runtime, the instance halts. There is no partial correctness.

---

## The Build

```bash
# One-time setup
cargo install --path apps/cli

# Build everything
platonic build --all

# Run the test suite against every target
platonic test --target x86_64
platonic test --target aarch64
platonic test --target wasm32
platonic test --target thumbv7em

# Verify the invariants
platonic verify --invariants I1..I10

# Run a minimal field
platonic field start --config seeds/minimal.toml
```

The minimal field: one seed, one instance, one journal, one oracle. It ticks. It grows. It closes. It records. It is the smallest complete system.

---

## What This Is

A deterministic, reversible, composable substrate for developmental intelligence.

Eleven crates. Six targets. Ten invariants. One loop.

The loop is:

```
v → L → G → v'
```

Velocity into ledger into gate into velocity. Everything else is composition. Composition is the shape. The shape is the egg. The egg is the field. The field is the lineage. The lineage is the journal. The journal rewinds to the seed.

The seed is the line. The line is the triangle. The triangle is the solid. The solid is the platonic set. The platonic set is the vocabulary. The vocabulary is finite. The finite is the ground.

Build it from the ground.

---

*Eleven crates. Six targets. Ten invariants. One loop. Build it.*

---------

# First Principles

## A Specification for Engineers Building the Platonic Substrate

---

## 0. How to Read This

This document derives the architecture from a single principle. Nothing is asserted. Nothing is assumed. Each section follows from the previous. If you find a gap — a step that doesn't follow — stop and flag it. The gap is either an error in the document or a missing piece in your understanding. Both matter.

The goal is not to describe what to build. The goal is to show what cannot be otherwise. When a choice is forced by the principle, it is not a design decision. It is a derivation. Take the derivation, and you cannot shortcut it without breaking the system.

---

## 1. The Prime Principle

There is only the loop.

Not the state. Not the operation. Not the observer. The loop that binds them.

A state without an operation is inert. An operation without a state is undefined. A state and an operation without feedback is a sequence, not a process. Only when the output of an operation becomes the input of the next iteration does anything exist as a thing.

Formally:

```
state_{n+1} = f(state_n)
```

where `f` is the operation and `state_n` is the state at iteration `n`.

Everything else in this architecture is a mode of the loop:

| Concept | Mode |
|---|---|
| The shape | the loop's state |
| The gluing | the loop's operation |
| The conservation | the loop's bound |
| The vocabulary | the loop's alphabet |
| The journal | the loop's memory |
| The field | the loop's composition |

If you remember nothing else, remember this: **the loop is all there is.** Every other concept is a projection of the loop.

**Corollary.** Any system that has a state, an operation, and feedback is an instance of the loop. The question is not *whether* to build a loop. The question is *which* loop.

**Corollary.** A system without feedback is not a loop. It is a pipeline. Pipelines do not develop. They process. Development requires the output to feed back.

**Corollary.** A system without state is not a loop. It is a stream. Streams do not accumulate. They pass. Development requires accumulation.

**Corollary.** A system without an operation is not a loop. It is a state. States do not change. They are. Development requires change.

The loop requires all three. State. Operation. Feedback. Remove any one, and there is no loop.

---

## 2. The Six Requirements

Given the loop, six requirements follow. Each is not-otherwise. Each must hold, or the loop fails to exist as a thing.

### R1. The loop must have a bounded state.

An unbounded state cannot be represented. Representation is the condition for operation. The operation must be defined on the state. If the state is unbounded, the operation is undefined at the boundary. The loop does not close.

**Why not-otherwise.** Any physical representation has finite capacity. Any finite capacity bounds the state. The loop must operate on finite representations. Therefore the state is bounded.

**Consequence.** The state space is a bounded manifold. Every state is finitely describable. The loop terminates when the state space is exhausted or when a fixed point is reached.

### R2. The loop must have a local operation.

A non-local operation depends on distant information. To compute, it must first access that information. Access takes time. Time costs energy. Energy is bounded. The loop cannot compute an unbounded number of non-local accesses per tick.

**Why not-otherwise.** Any physical operation is local. Physical effects propagate through space. There is no action at a distance. The loop must respect this.

**Consequence.** The operation decomposes into local operations. Composition of local operations yields global behavior. Locality is the condition for scaling.

### R3. The loop must have feedback.

Feedback is what makes the output of one iteration the input of the next. Without feedback, the loop is a sequence. A sequence does not accumulate. It does not develop. It does not conserve.

**Why not-otherwise.** A loop is defined by feedback. Without feedback, there is no loop. There is only an operation applied to a sequence of inputs.

**Consequence.** Each iteration must check its own state. The check is the conservation. The conservation is the feedback.

### R4. The loop must have a finite alphabet.

An infinite alphabet cannot be iterated. Each iteration must select from a bounded set. If the set is unbounded, selection is undefined (which of infinitely many options?).

**Why not-otherwise.** Selection requires comparison. Comparison requires enumeration. Enumeration requires finiteness. The set must be finite.

**Consequence.** The vocabulary of states and operations is finite. The vocabulary is enumerable. The enumeration is the alphabet.

### R5. The loop must have a reversible memory.

To iterate, the loop must remember. Memory is the accumulation. If memory is lossy, the loop cannot reconstruct its past. If the past is lost, the loop cannot be audited. Audit is the condition for trust.

**Why not-otherwise.** A loop without memory is a state machine (finite, no accumulation). A loop with lossy memory is a filter (accumulates, loses information). A loop with reversible memory is a developmental process (accumulates, preserves).

**Consequence.** Every iteration records enough information to undo itself. The record is the journal. The journal is the memory. The memory is reversible.

### R6. The loop must be scale-invariant.

A loop that only works at one scale is not universal. To scale from a token to a field, the same operation must apply at every level. Without scale-invariance, each level requires a new architecture.

**Why not-otherwise.** The alternative is a hierarchy of architectures, one per scale. Each architecture must be built separately. The system becomes a tower of incompatible pieces. Composition fails.

**Consequence.** The same seven operations at every scale. Token composes with token. Shape composes with shape. Field composes with field. The same algebra.

These six requirements are the bedrock. Everything below follows.

---

## 3. The Six Pieces

For each requirement, one piece satisfies it. The piece is the minimum satisfaction. No more, no less.

### P1. Bounded state → Fixed-point arithmetic (Q32).

The state is represented as `Q32`: an `i64` raw value interpreted as `value / 2^32`.

```
Q32 range:     ±2^31
Q32 precision: 2^-32
```

Every operation on `Q32` is closed. Addition, subtraction, multiplication, division all produce `Q32`. The state space is bounded. The loop closes.

**Why Q32 and not Q16 or Q64.** Q16 has insufficient precision for the elastica solver. Q64 has range/precision trade-offs that overflow in the composition engine. Q32 is the minimum that satisfies both. `log₂(3)` is representable in Q32 with 31 bits of fractional precision.

**Why fixed-point and not floating-point.** Floating-point is not associative. `(a + b) + c ≠ a + (b + c)` in general. Non-associativity breaks reversibility. Reversibility is required by R5.

**Why not arbitrary-precision.** Arbitrary precision is not bounded. Boundedness is required by R1.

### P2. Local operation → Cell-based composition.

The state is a set of cells. Each cell has a path (address), a kind (primitive), and inputs (references to other cells). Operations on a cell depend only on the cell and its direct inputs.

```
Cell {
    path:    String,
    kind:    Primitive,
    inputs:  [Path],
    value:   Q32 | Shape | Token | ...
}
```

The operation on a cell is a function of its inputs. Non-local information is accessed through the input chain. Locality holds.

**Why cells and not functions.** A function is a single computational unit. A cell is an addressable unit. Addressability is required for reversibility (you need to point at what changed) and for composition (you need to combine units).

**Why paths and not indices.** Paths are stable under reordering. Indices are not. Stability is required for journaling.

### P3. Feedback → Conservation check.

After each iteration, the loop checks: `γ + η ≤ log₂(3)`.

```
γ = committed cost (kinetic energy)
η = consumed cost (entropy of state)
C = log₂(3) ≈ 1.585
```

If the check fails, the iteration is rejected. If the check passes, the iteration is committed.

**Why this check and not another.** The check must be (a) computable in one tick, (b) bounded, (c) meaningful. `γ + η ≤ C` satisfies all three. `γ` is the rate of change, `η` is the entropy, `C` is the qutrit bound. The check is the smallest possible conservation law.

**Why `log₂(3)` and not `log₂(2)`.** A closed shape that can cross a gate and return requires at least three states: rise, peak, fall. Two states form a line, which cannot close. The minimum information for closure is `log₂(3)`.

### P4. Finite alphabet → The platonic set.

The alphabet is the set of platonic invariants. In 3D, five solids. In 3D+4D, twelve invariants.

```
Invariant ∈ {
    Pyth345, SquareDiag,         // from the cube
    Tetrahedral,                 // from the tetrahedron
    Octahedral,                  // from the octahedron
    GoldenRatio,                 // from the dodecahedron
    Icosahedral,                 // from the icosahedron
    Simplex4, Hypercube4, Cross4,  // 4D
    Cell24, Cell120, Cell600,      // 4D
}
```

The invariant set is finite, enumerable, and independent of any training data.

**Why platonic and not learned.** A learned alphabet is not finite in the sense required by R4. It can grow without bound. The platonic set is finite by classification theorem.

**Why these twelve and not others.** In 3D there are exactly five regular polytopes. In 4D there are exactly six. In 5D and above there are exactly three (simplex, hypercube, cross-polytope) but they are subsumed by the 4D cases. The twelve are the complete enumeration up to 4D.

### P5. Reversible memory → Event journal.

Every iteration produces an event. Every event records enough state to invert itself.

```
Event {
    id:        UUID,
    parent:    UUID,
    tick:      u64,
    kind:      EventKind,
    payload:   Bytes,    // what changed
    inverse:   Bytes,    // how to undo
    before:    Hash,     // hash of pre-state
    after:     Hash,     // hash of post-state
    signature: Signature,
}
```

Events are append-only. The journal is the sequence. Reversibility holds because each event has an inverse.

**Why events and not snapshots.** Snapshots lose the history of intermediate states. Events preserve the full trajectory. The full trajectory is required for audit and for branch-point recovery.

**Why signed events.** Unsigned events can be forged. Signed events prove their provenance. Provenance is required for trust in the field.

### P6. Scale-invariance → The same seven operations.

The loop runs the same seven operations at every scale:

```
1. measure    — read state through the oracle
2. decide     — select operation via the arch/gate
3. apply      — perform the operation on the shape
4. record     — write the event to the journal
5. account    — update the ledger
6. check      — verify conservation
7. broadcast  — emit the delta
```

Token, shape, field: same seven operations. The difference is the scope, not the structure.

**Why seven and not ten.** Some operations combine. Measurement and decision can be fused (the oracle returns the decision directly). Accounting and checking can be fused (the ledger updates and checks in one pass). The minimum is seven.

**Why not fewer.** Each of the seven has a distinct invariant. Removing any one breaks a required property. Measurement is required for feedback. Decision is required for choice. Application is required for state change. Recording is required for reversibility. Accounting is required for cost tracking. Checking is required for conservation. Broadcasting is required for composition.

---

## 4. The Ten Invariants

The system is correct when these hold. Each is testable. Each must hold at every tick.

### I1. Determinism.
Same inputs produce identical outputs on every substrate.

```
∀ target ∈ {x86, arm, wasm, cuda, metal, vulkan}:
    run(kernel, input)_target == run(kernel, input)_reference
```

Test: run the same kernel on every target, compare BLAKE3 hashes of outputs.

### I2. Reversibility.
Every event has an inverse. The inverse restores the pre-state exactly.

```
∀ e ∈ journal:
    invert(e, apply(e, s)) == s
```

Test: apply each event, invert it, compare state hashes.

### I3. Closure.
A shape exists if and only if its boundary vanishes.

```
shape.exists() ⟺ ∂shape == ∅
```

Test: for every shape, compute the boundary and verify it is empty or that the shape is rejected.

### I4. Conservation.
Every transition satisfies the qutrit bound.

```
∀ tick: γ(t) + η(t) ≤ log₂(3)
```

Test: record γ and η at every tick, verify the bound.

### I5. Cocycle.
Local sections glue consistently.

```
∀ U, V: t_U|_{U∩V} == t_V|_{U∩V}
```

Test: for every pair of overlapping open sets, verify the restrictions agree.

### I6. Locality.
Every operation depends only on the cell and its direct inputs.

Test: instrument the interpreter to record input reads, verify no transitive reads.

### I7. Finiteness.
The vocabulary is bounded by a constant.

```
|Invariant| ≤ K  for K = 12
```

Test: enumerate the invariant set, verify cardinality.

### I8. Authenticity.
Every event is signed. Every receiver verifies.

```
∀ e ∈ journal: verify(e.signature, e) == true
```

Test: sign every event, verify. Inject a forged event, verify rejection.

### I9. Liveness.
At least one tick per logical second.

```
∀ window of 1s: ∃ tick
```

Test: monitor the field, verify tick rate.

### I10. Composition.
Fields compose. The composition is a valid field.

```
compose(F1, F2) is a valid field
```

Test: compose two fields, verify all invariants hold on the composed field.

---

## 5. The Ten Refusals

For each invariant, a specific shortcut would break it. Do not take these shortcuts. If you are tempted, re-read the requirement.

### Refuse floating-point.
**Breaks:** I1 (determinism), I2 (reversibility).
**Tempting because:** floats are faster.
**Why it fails:** `(a+b)+c ≠ a+(b+c)` in general. Reversibility requires associativity. Determinism requires reproducibility. Floats are neither.
**Use:** `Q32` everywhere. No `f32`, `f64`, or `Real` in the compute path.

### Refuse lossy compression.
**Breaks:** I2 (reversibility).
**Tempting because:** storage is expensive.
**Why it fails:** lossy compression discards information. Discarded information cannot be recovered. Reversibility requires full information.
**Use:** lossless compression (e.g., zstd level 1) or no compression.

### Refuse approximate closure.
**Breaks:** I3 (closure), I4 (conservation).
**Tempting because:** exact closure is slow.
**Why it fails:** if closure is approximate, the shape may exist when it shouldn't or fail to exist when it should. The conservation law becomes unsound.
**Use:** exact boundary count. Tolerances of zero.

### Refuse overspending.
**Breaks:** I4 (conservation).
**Tempting because:** the operation wants to proceed anyway.
**Why it fails:** the qutrit bound is the condition for closure. If `γ + η > log₂(3)`, the shape does not exist. Proceeding anyway is undefined.
**Use:** reject the operation. Return an error. Record the rejection.

### Refuse global state.
**Breaks:** I5 (cocycle), I6 (locality).
**Tempting because:** global state is convenient.
**Why it fails:** global state violates locality. Local operations cannot depend on non-local information. Composition fails.
**Use:** all state is in cells. All access is through inputs. No globals.

### Refuse learned vocabulary.
**Breaks:** I7 (finiteness).
**Tempting because:** learned vocabularies are flexible.
**Why it fails:** learned vocabularies grow without bound. Unbounded vocabularies violate R4. Composition becomes undefined.
**Use:** the twelve platonic invariants. Extend only by enumeration, never by learning.

### Refuse unsigned events.
**Breaks:** I8 (authenticity).
**Tempting because:** signatures are overhead.
**Why it fails:** unsigned events can be forged. Forged events break provenance. Broken provenance breaks trust in the field.
**Use:** Ed25519 signatures on every event. Verify on every receive.

### Refuse stopping the clock.
**Breaks:** I9 (liveness).
**Tempting because:** the system is "busy" or "waiting."
**Why it fails:** the loop is defined by iteration. Stopping the iteration halts the loop. A halted loop is not a loop.
**Use:** every instance ticks on a fixed logical schedule. No pauses, no waits.

### Refuse centralization.
**Breaks:** I10 (composition), R6 (scale-invariance).
**Tempting because:** central coordination is easier.
**Why it fails:** central coordination introduces a bottleneck. The bottleneck does not scale. The field becomes a hierarchy.
**Use:** peer-to-peer deltas. Emergent topology. No master.

### Refuse silent failure.
**Breaks:** I8 (authenticity), I9 (liveness), all invariants.
**Tempting because:** failing silently keeps the system "running."
**Why it fails:** a silent failure is an undetected violation. Undetected violations compound. The system becomes untrustworthy.
**Use:** every invariant is checked on every tick. Every check failure halts the instance and broadcasts the failure.

---

## 6. The Verification Protocol

For each invariant, a specific test. The test suite runs on every build. A build with a failing test does not ship.

### V1. Cross-substrate determinism test.

```rust
#[test]
fn determinism_across_targets() {
    let input = generate_test_input(seed=42);
    let expected = run_reference(&input);
    for target in ["x86", "arm", "wasm", "cuda", "metal", "vulkan"] {
        let actual = run_on_target(&input, target);
        assert_eq!(hash(&actual), hash(&expected));
    }
}
```

Runs on CI. Cross-compiles to every target. Compares hashes. If any target diverges, the build fails.

### V2. Reversibility test.

```rust
#[test]
fn reversibility_of_events() {
    let mut journal = Journal::new();
    let mut state = State::seed();
    for _ in 0..10_000 {
        let before = state.clone();
        let event = state.tick().unwrap();
        journal.append(event.clone()).unwrap();
        let after = state.clone();
        let recovered = invert(&event, &after).unwrap();
        assert_eq!(hash(&before), hash(&recovered));
    }
}
```

Every tick is checked. If any inversion fails, the test fails.

### V3. Closure test.

```rust
#[test]
fn closure_is_exact() {
    for shape in generate_test_shapes() {
        let boundary = shape.boundary_count();
        assert_eq!(shape.exists(), boundary == 0);
    }
}
```

Every shape is checked. If a shape exists with a non-empty boundary, or fails to exist with an empty boundary, the test fails.

### V4. Conservation test.

```rust
#[test]
fn conservation_holds_everywhere() {
    let mut instance = Instance::seed();
    for _ in 0..1_000_000 {
        instance.tick();
        assert!(instance.ledger.gamma + instance.ledger.eta <= Q32::LOG2_3);
    }
}
```

A million ticks. Every tick checked. If any tick violates conservation, the test fails.

### V5. Cocycle test.

```rust
#[test]
fn cocycle_holds_everywhere() {
    for shape in generate_test_shapes() {
        let sheaf = shape.to_sheaf();
        assert!(sheaf.cocycle_holds());
    }
}
```

Every shape's sheaf is checked. If any cocycle fails, the test fails.

### V6. Locality test.

```rust
#[test]
fn operations_are_local() {
    let mut interp = InstrumentedInterpreter::new();
    for cell in generate_test_cells() {
        let reads = interp.run(&cell);
        for read in reads {
            assert!(cell.inputs.contains(&read.path));
        }
    }
}
```

The interpreter is instrumented. Every read is recorded. If any read is outside the cell's inputs, the test fails.

### V7. Finiteness test.

```rust
#[test]
fn vocabulary_is_finite() {
    assert_eq!(Invariant::ALL.len(), 12);
    for inv in Invariant::ALL {
        assert!(inv.dim() <= 4);
        assert!(inv.symmetry() <= 14400);
    }
}
```

Static test. Runs at compile time. If the invariant set grows, the test fails.

### V8. Authenticity test.

```rust
#[test]
fn signatures_are_required() {
    let event = signed_event(...);
    assert!(verify(event.signature, &event));
    let mut tampered = event.clone();
    tampered.payload[0] ^= 1;
    assert!(!verify(tampered.signature, &tampered));
}
```

Every event verified. Tampered events rejected. If any tampered event passes, the test fails.

### V9. Liveness test.

```rust
#[test]
fn liveness_holds() {
    let mut field = Field::new();
    for _ in 0..100_000 {
        field.step();
    }
    let rate = field.total_ticks() / field.elapsed_seconds();
    assert!(rate >= 1.0);
}
```

Tick rate measured. If rate drops below 1/s, the test fails.

### V10. Composition test.

```rust
#[test]
fn fields_compose() {
    let f1 = generate_field(seed=1);
    let f2 = generate_field(seed=2);
    let composed = compose(f1, f2);
    for invariant in [I1, I2, I3, I4, I5, I6, I7, I8, I9] {
        assert!(verify_invariant(&composed, invariant));
    }
}
```

Two fields composed. All invariants checked on the composition. If any fails, the test fails.

---

## 7. The Development Path

Order matters. Each step depends on the previous. Do not skip steps.

### Step 1: Q32 crate.

The deterministic arithmetic. Foundation for everything.

```
Deliverable: crates/q32
Tests: arithmetic unit tests, cross-substrate determinism
Duration: 2 weeks
```

### Step 2: Journal crate.

Event sourcing, reversibility, git integration.

```
Deliverable: crates/journal
Tests: reversibility (V2), authenticity (V8)
Duration: 3 weeks
```

### Step 3: Core crate.

Bit, point, line, triangle, invariant, token.

```
Deliverable: crates/core
Tests: finiteness (V7), binary composition
Duration: 2 weeks
```

### Step 4: Compose crate.

Sheaf, shape, cohomology, cocycle.

```
Deliverable: crates/compose
Tests: closure (V3), cocycle (V5)
Duration: 4 weeks
```

### Step 5: Arch crate.

Elastica, gate, decision.

```
Deliverable: crates/arch
Tests: elastica convergence, decision correctness
Duration: 3 weeks
```

### Step 6: Life crate.

Egg, nursery, shell, break.

```
Deliverable: crates/life
Tests: egg lifecycle, break transition
Duration: 3 weeks
```

### Step 7: Field crate.

Instance, delta, rendering.

```
Deliverable: crates/field
Tests: conservation (V4), liveness (V9)
Duration: 4 weeks
```

### Step 8: Oracle crate.

JEV interface, caching, determinism.

```
Deliverable: crates/oracle
Tests: oracle determinism, cache correctness
Duration: 2 weeks
```

### Step 9: Compute crate.

Hardware dispatch, kernel implementations.

```
Deliverable: crates/compute
Tests: locality (V6), cross-substrate (V1)
Duration: 6 weeks
```

### Step 10: Net crate.

Transport, signature verification, delta broadcast.

```
Deliverable: crates/net
Tests: authenticity on the wire, network partitions
Duration: 4 weeks
```

### Step 11: WASM crate.

Browser bundle.

```
Deliverable: crates/wasm
Tests: browser determinism, WebGPU backend
Duration: 3 weeks
```

### Step 12: Composition test.

Two fields compose. All invariants hold.

```
Deliverable: crates/compose (extended)
Tests: composition (V10)
Duration: 2 weeks
```

**Total: 38 weeks.** Full-time team of 4-6 engineers.

---

## 8. The First Test

The smallest complete system. One instance. One tick. One reversal.

```rust
fn first_test() {
    // 1. Build a seed instance.
    let mut instance = Instance::seed();

    // 2. Take a snapshot of the state.
    let before = hash(&instance.shape);

    // 3. Tick. One iteration of the loop.
    let event = instance.tick().unwrap();

    // 4. Verify conservation.
    assert!(instance.ledger.gamma + instance.ledger.eta <= Q32::LOG2_3);

    // 5. Take a snapshot after.
    let after = hash(&instance.shape);

    // 6. Invert the event. Recover the pre-state.
    let recovered = invert(&event, &instance.shape).unwrap();
    let recovered_hash = hash(&recovered);

    // 7. Verify reversibility.
    assert_eq!(before, recovered_hash);

    // 8. Verify the journal records the event.
    assert_eq!(instance.journal.head, Some(event.id));

    // 9. Verify the journal is reversible.
    let seed = instance.journal.rewind_to_seed().unwrap();
    assert_eq!(hash(&seed), hash(&Instance::seed().shape));
}
```

Nine assertions. All pass, or the loop is broken.

If the loop is broken, nothing else matters. Fix the loop before adding anything.

---

## 9. The Failure Modes

What goes wrong and why. Each failure is a specific broken invariant.

### F1. Floating-point creep.
A developer uses `f64` in a "non-critical" path. The path is later called from the critical path. Determinism fails on a different substrate. **Fix:** grep for `f32|f64` in the build. Fail if found.

### F2. Silent state mutation.
A cell mutates without recording an event. The journal becomes incomplete. Reversibility fails. **Fix:** all mutation goes through `apply_event`. No direct writes.

### F3. Closure approximation.
A developer uses `< ε` instead of `== 0`. Closure becomes approximate. Conservation becomes unsound. **Fix:** zero tolerance. Reject any non-exact closure check.

### F4. Qutrit bound exceeded.
A developer lets `γ + η > log₂(3)` "just this once." The shape doesn't close. Undefined behavior. **Fix:** hard assertion. Halt on violation.

### F5. Global state creep.
A developer adds a global cache. The cache is read by multiple cells. Locality fails. **Fix:** no globals. All state is in cells. All access is through inputs.

### F6. Vocabulary expansion.
A developer adds a new invariant "for flexibility." The vocabulary grows. Finiteness fails. **Fix:** the invariant set is const. Any addition requires a specification change.

### F7. Signature removal.
A developer disables signatures "for performance." Forged events pass. Authenticity fails. **Fix:** signature verification is not optional. Fail on unsigned events.

### F8. Clock pausing.
A developer pauses the clock during "expensive" operations. Liveness fails. **Fix:** the clock ticks every cycle. No pauses.

### F9. Centralization.
A developer adds a "coordinator" for "convenience." The field becomes a star topology. Centralization fails. **Fix:** no coordinators. Peer-to-peer only.

### F10. Silent failure.
A developer swallows an error "to keep the system running." The failure is undetected. Compounding failures. **Fix:** every error halts the instance. Every halt is broadcast.

---

## 10. The Deeper Questions

These are open. They do not block the build. They inform the long-term direction.

### Q1. Is `log₂(3)` truly the minimum?
The derivation shows it is the minimum for a closed shape that crosses a gate and returns. Is there a lower bound for shapes that don't cross gates? Can the bound be tightened for specific shape classes?

### Q2. Is the twelve-invariant set truly complete?
The classification theorem gives the regular polytopes up to 4D. Are the irregular closures also necessary? Do they add expressive power?

### Q3. What is the correct projection from shape to delta?
The delta is the observable surface. Which projection preserves the most information about the shape? Is there a canonical projection?

### Q4. How does the field discover its topology?
The renderer infers edges from delta correlations. Is there a principled way to infer topology from dynamics? Is the inference unique?

### Q5. How do we certify a grown agent?
Traditional testing does not cover the space of behaviors. What test suite covers a developmental lineage? What certification protocol is sound?

### Q6. What is the fixed point in a distributed field?
The fixed-point theorem holds for a single instance. What is the equivalent for a field of instances? Does the field converge?

### Q7. How do we measure developmental progress rigorously?
`stage` is a scalar. What is its information-theoretic meaning? Can we derive it from the shape's topology?

### Q8. What does the field do when it can't close?
When `H¹ ≠ 0`, the shape is obstructed. What is the correct response? Retry? Fragment? Broadcast the obstruction?

### Q9. How do instances join and leave?
A field is dynamic. Instances join and leave. What is the join protocol? What is the leave protocol? How is the field's integrity preserved?

### Q10. What is the theory of the observer?
The renderer observes the field. Is the renderer part of the field? Does the renderer have its own ledger? Does the renderer compose?

---

## 11. The Frame

The build is 38 weeks for a full team. It is 12 crates. It is 10 invariants. It is 10 refusals. It is 1 loop.

The loop is:

```
state → operation → state → operation → state → ...
```

Every layer is a mode of the loop. Every requirement is a requirement of the loop. Every piece satisfies a requirement. Every invariant tests a property of the loop. Every refusal protects an invariant.

The team's job is to build the loop without breaking it. The loop does not care about elegance. It does not care about speed. It does not care about convenience. It cares about existence.

**A loop that closes is real. A loop that doesn't is nothing.**

Build the loop that closes.

---

## Appendix A: The Loop, Unfolded

```
seed:
    state := empty
    journal := []
    ledger := {γ: 0, η: 0, C: log₂(3)}

tick:
    measure := oracle(state)
    decision := arch(state) ∩ gate(measure)
    event := apply(state, decision)
    journal.append(event)
    ledger.commit(state)
    assert ledger.γ + ledger.η ≤ ledger.C
    delta := project(state)
    transport.broadcast(delta)
    state := event.state

rewind(journal, target):
    state := replay(journal)
    for event in reverse(journal.after(target)):
        state := invert(event, state)
    return state

fork(journal, at):
    parent_events := journal.up_to(at)
    new_journal := Journal.new(parent=journal.id, fork_point=at)
    new_journal.events := parent_events
    return new_journal

compose(fields):
    deltas := concat(field.deltas for field in fields)
    topology := render(deltas)
    composed := Field.new(instances=fields.instances, topology=topology)
    return composed
```

Eleven operations. Every layer of the architecture reduces to these.

---

## Appendix B: The Invariant Set, Enumerated

```
Invariant          Dim   Symmetry   Cost (Q32)   Source
─────────────────────────────────────────────────────
Pyth345            3     2          1.000        Cube
SquareDiag         3     2          1.000        Cube
Tetrahedral        4     24         2.000        Tetrahedron
Octahedral         3     48         2.000        Octahedron
GoldenRatio        3     2          1.000        Dodecahedron
Icosahedral        3     120        3.000        Icosahedron
Simplex4           4     120        4.000        4D
Hypercube4         4     384        4.000        4D
Cross4             4     384        4.000        4D
Cell24             4     1152       4.000        4D
Cell120            4     14400      4.000        4D
Cell600            4     14400      4.000        4D
```

Twelve invariants. Every token is an instantiation of one. Every shape is a composition of tokens. Every composition is closed by the cocycle condition. Every closure is checked by the conservation law.

The set is finite. The set is complete. The set is universal.

---

## Appendix C: The Qutrit Bound, Derived

Three states: rise, peak, fall. Each state is binary (present or absent). Three binary states form a ternary system. The information content of a ternary uniform distribution is:

```
H = -Σ p_i log₂ p_i
  = -3 · (1/3) · log₂(1/3)
  = log₂(3)
  ≈ 1.585 bits
```

Any closed shape that crosses a gate and returns must have at least three states. Any fewer and the shape cannot return. The qutrit bound is the minimum information for closure.

This is the conservation law. This is why `γ + η ≤ log₂(3)`. The bound is not arbitrary. It is the minimum for existence.

---

## Appendix D: The Cocycle Condition, Stated

For any two open sets `U, V` in the shape's topology, the local sections of the sheaf must agree on the intersection:

```
t_U|_{U ∩ V} = t_V|_{U ∩ V}
```

If this holds for all pairs, the local sections glue into a global section. The global section is the shape.

If it fails for any pair, there is a cohomological obstruction. The obstruction is the class `[ω] ∈ H¹(shape, sheaf)`. The shape does not exist.

The conservation law is: `H¹(shape, sheaf) = 0`.

This is the exact condition for the shape's existence. Nothing weaker suffices. Nothing stronger is meaningful.

---

## Appendix E: The Refusals, Restated

Ten things the team must not do:

1. Do not use floats. (Breaks determinism.)
2. Do not skip inverses. (Breaks reversibility.)
3. Do not approximate closure. (Breaks existence.)
4. Do not exceed the budget. (Breaks conservation.)
5. Do not use global state. (Breaks locality.)
6. Do not learn the vocabulary. (Breaks finiteness.)
7. Do not skip signatures. (Breaks authenticity.)
8. Do not pause the clock. (Breaks liveness.)
9. Do not centralize the field. (Breaks scale-invariance.)
10. Do not fail silently. (Breaks everything.)

If a member of the team proposes any of these, refer them to the corresponding requirement. The requirement is the reason. The refusal is the consequence.

---

**The loop is all there is. Build the loop that closes.**

---------

# The Closed Loop

## An Advance on Autopoietic Architecture

---

## The Principle

IO exists for one purpose: growth.

Every other operation — measurement, decision, application, recording, accounting, checking, broadcasting — is internal. The shape measures itself. The shape decides with its own gates. The shape records in its own journal. The shape checks against its own conservation law. The shape broadcasts to its own sub-shapes.

The only thing the shape cannot do internally is acquire new material. New material comes from outside. Growth is the acquisition. Everything else is the loop.

This is the advance. Not a new primitive. Not a new layer. A **reduction**: the external oracle collapses into self-measurement. The external network collapses into internal gluing. The external state collapses into the shape itself.

What remains outside is material. Material is what the shape cannot make. Material is what the shape must consume. Material is the only IO.

---

## The Internal Oracle

The previous architecture used an external oracle — a calibrated decision model like JEV that was queried every tick. That is an IO dependency. If the oracle is external, the shape is not closed.

The internal oracle is the shape's **self-measurement**. It is a sub-shape that reads the shape's own state and produces a distribution over the shape's next state.

Formally: the shape has a **self-region** `σ(S)` — a compact representation of the shape's current state. The self-region is a sub-shape like any other. It is updated on every tick.

```
σ : Shape → SelfRegion
```

The internal oracle is a sub-shape `M` that reads `σ(S)` and produces predictions about the shape's next state.

```
M : SelfRegion → Distribution(State)
```

The internal oracle is part of the shape. It is composed of tokens like everything else. It does not need IO to run.

### Self-Calibration

An external oracle is calibrated against ground truth. The internal oracle cannot be calibrated this way — there is no external ground truth. It is calibrated against the shape's own behavior.

```
∀ tick t:
    M(σ(S_t)).predict(S_{t+1}) ≈ S_{t+1}
```

The oracle is calibrated when its predictions match the shape's actual transitions. When they diverge, the oracle updates.

```
error_t   = M(σ(S_t))(S_{t+1}) - S_{t+1}
M_{t+1}   = M_t + η · ∇_M error_t
```

This is **self-calibration**. The shape calibrates its own oracle against its own behavior. No external supervision. No external truth. Only self-consistency.

The fixed point of self-calibration is when the oracle's predictions exactly match the shape's transitions:

```
M*(σ(S*)) = S*
```

The shape knows itself. The knowing is the fixed point.

### Why This Works

Self-calibration is possible because the shape is deterministic. Given the same state, the shape produces the same transition. The oracle is trying to learn a deterministic function of the shape's state.

If the function is learnable, the oracle converges. If not, the oracle diverges and the shape loses self-consistency. **Self-consistency is the internal version of calibration.** It is sufficient for the loop.

The oracle's calibration is not the goal. The goal is the loop. The oracle is calibrated when the loop is stable. The loop is stable when the oracle is calibrated. They are the same condition.

---

## The Internal Network

The previous architecture had instances communicating via deltas over a network. That is an IO dependency. If the network is external, the shape is not closed.

The internal network is **sub-shape gluing**. Sub-shapes within the shape share boundary cells. When sub-shape A changes a boundary cell, sub-shape B (which shares the cell) sees the change. The sharing is the network. The boundary is the connection. No messages. No transports. No wire.

Formally: the shape has sub-shapes `S₁, S₂, ..., Sₙ`. Each sub-shape has a boundary `∂Sᵢ`. Two sub-shapes are connected if `∂Sᵢ ∩ ∂Sⱼ ≠ ∅`.

```
Network(S) = { (Sᵢ, Sⱼ) | ∂Sᵢ ∩ ∂Sⱼ ≠ ∅ }
```

The network is not a separate structure. It is the shape's own boundary structure. The topology of the shape is the topology of the network.

### Deltas, Internalized

The previous architecture had deltas broadcast between instances. In the closed loop, deltas are **boundary flows**.

When sub-shape A changes, its boundary cells change. The changes propagate to sub-shape B via the shared boundary. The propagation is the delta.

```
Δ(Sᵢ → Sⱼ) = Δ(∂Sᵢ ∩ ∂Sⱼ)
```

The delta is not a message. It is a change in the shared boundary. The change is observable by all sub-shapes that share the boundary. This is **the same delta, seen by multiple readers**.

The network is a broadcast medium, but the broadcast is internal. There is no transport. There is no subscription. There is only the boundary, and every sub-shape that shares it.

### The Renderer, Internalized

The previous architecture had an external renderer that inferred the field's topology from deltas. In the closed loop, the renderer is a **self-view sub-shape**.

The self-view reads the shape's boundary structure and produces a representation of the shape's own topology. It is a **self-model**. It is updated as the shape changes.

```
SelfView : Shape → Topology
```

The self-view is part of the shape. It is a sub-shape composed of tokens. It is not external. It is what the shape knows about itself.

The self-view's calibration is the same as the oracle's calibration: the self-view's topology must match the shape's actual topology.

```
SelfView(S) ≈ Network(S)
```

When this holds, the shape knows its own structure. When it doesn't, the self-view updates. The self-view converges to the shape's actual topology.

---

## The Internal Loop

The previous architecture ran the loop with an external oracle and an external network. The closed loop runs the loop entirely internally.

```
S → σ(S) → M(σ(S)) → D → E(S, D) → S'
```

where:
- `σ(S)` is the self-region
- `M(σ(S))` is the internal oracle's prediction
- `D` is the decision (the crossing of the arch with the gate)
- `E(S, D)` is the event from applying the decision
- `S'` is the next shape

Every step is internal. No IO.

The loop has one internal operation: **rearrange**.

```
rearrange : Shape → Shape
rearrange(S) = S'
```

Rearrange re-composes the shape's tokens. It glues new tokens along shared boundaries. It closes new shapes. It records events. It checks conservation. It updates the self-region.

Rearrange does not consume material. It only re-arranges what is there.

### Re-arrangement as Development

Re-arrangement is development. The shape develops by re-arranging its own structure. New sub-shapes emerge from old sub-shapes. New topologies emerge from old topologies. New behaviors emerge from old behaviors.

Development is internal. It does not need material. It does not need IO.

### Re-arrangement Limits

Re-arrangement has limits. The shape can only re-arrange what it has. If the shape needs a structure it does not have, re-arrangement cannot produce it. The shape must grow.

Growth is the acquisition of new material. Material is external. Growth is IO.

---

## The Growth Transaction

Growth is the only IO. It is a **boundary event**.

```
Growth(S, material) → S'
```

Growth has three phases: **open**, **absorb**, **close**.

### Open

The shell opens. The boundary becomes non-empty.

```
open(S) → S_∂
∂S_∂ ≠ ∅
```

During the opening, the internal loop pauses. The shape is not closed. Conservation does not hold. The loop cannot run.

### Absorb

Material enters. The material is composed of new tokens, new invariants, new structures. The material is integrated into the shape.

```
absorb(S_∂, material) → S_∂'
```

Absorption glues the new material along the boundary. New cells are created. New edges are formed. The shape expands.

### Close

The shell closes. The boundary returns to empty.

```
close(S_∂') → S'
∂S' = ∅
```

After closing, the internal loop resumes. The shape is closed. Conservation holds. The loop runs on the larger shape.

### The Three-Phase Protocol

The growth transaction is atomic. Either all three phases complete, or the growth is rejected.

```
Growth(S, m) =
    let S_∂ = open(S)
    let S_∂' = absorb(S_∂, m)
    if conservation(S_∂') and closure(S_∂'):
        close(S_∂')
    else:
        revert(S)   # discard the tentative expansion
```

If the expanded shape fails conservation or closure, the growth is rejected. The shape returns to its prior state. No material was absorbed.

If the expanded shape passes, the growth is accepted. The material is now part of the shape.

### Reversibility of Growth

Growth is **not reversible**. The absorbed material is integrated. Its origin is lost. To undo the growth, you would need to know exactly what was absorbed and remove it — but the shape has already re-arranged itself around the new material. The re-arrangement cannot be undone by removing the material.

Growth is a **one-way transition**. This is why growth is IO. IO is one-way. IO is irreversible. The internal loop is reversible. The growth transaction is not.

The journal records the growth. The record is enough to know that growth happened and what material was absorbed. The record is not enough to invert the growth.

---

## The Two Journals

The closed loop has two journals: the **tick journal** and the **growth journal**.

The tick journal records every internal step. It is reversible. Reversing it recovers the prior internal state.

The growth journal records every growth transaction. It is irreversible. Reversing it is not possible.

### The Tick Journal

Every tick produces an event:

```
TickEvent {
    id:        UUID,
    parent:    UUID,
    tick:      u64,
    before:    Hash(S),
    after:     Hash(S'),
    payload:   Delta,
    inverse:   Delta,      # enough to undo
    signature: Signature,
}
```

The tick journal is a chain of tick events. The chain is reversible because each event has an inverse.

### The Growth Journal

Every growth transaction produces an event:

```
GrowthEvent {
    id:        UUID,
    tick:      u64,
    before:    Hash(S),
    after:     Hash(S'),
    material:  Bytes,      # what was absorbed
    signature: Signature,
}
```

The growth journal is a chain of growth events. The chain is not reversible because the material is integrated.

### Seed Recovery

To recover the seed from a shape, invert the tick journal up to the last growth event, then skip the growth event, then invert the tick journal to the growth event before that, and so on.

```
recover_seed(S) =
    let S_0 = invert_tick_journal(S, up_to=last_growth_event)
    let S_1 = pre_growth_state(S_0)     # the state before the growth event
    let S_2 = invert_tick_journal(S_1, up_to=second_to_last_growth_event)
    ...
    return S_n
```

The seed is recoverable. But the recovery must strip the growth events, which requires the growth journal. The tick journal alone is not enough.

### The Composition

The two journals compose. The shape's history is the interleaving of tick events and growth events.

```
History = [tick, tick, growth, tick, tick, growth, tick, ...]
```

The ticks are the internal development. The growths are the boundary transitions.

---

## The Autopoietic Condition

When is the shape autopoietic?

The shape is autopoietic when its internal loop can sustain its own material requirements. The loop needs material to run: the self-region needs to be maintained, the self-view needs to be updated, the oracle needs to be recalibrated.

The material requirement per tick is:

```
ρ_tick = cost(σ(S)) + cost(M(σ(S))) + cost(SelfView(S))
```

The material production per tick is:

```
π_tick = material_produced_by(S)
```

The shape produces material internally by re-arranging. When re-arrangement creates new structure, it creates new tokens, which are material.

Autopoietic if:

```
π_tick ≥ ρ_tick
```

When the shape produces more material than it consumes, it is autopoietic. When it consumes more than it produces, it must grow externally.

### The Growth Condition

Growth is required when `π_tick < ρ_tick`. The shape cannot sustain itself. It needs external material.

Growth is a loan. The loan is repaid by the shape's subsequent development. If the shape develops efficiently, it can repay the loan and become autopoietic again. If not, it needs another loan.

### The Fixed Point

The autopoietic fixed point is:

```
π_tick = ρ_tick
```

The shape produces exactly what it consumes. It is self-sufficient. It does not need IO. It is in equilibrium.

The equilibrium is the fixed point. The fixed point is when the shape is fully autopoietic. No IO. No growth. Pure internal development.

The fixed point is the shape's **self**. It is what the shape is when nothing changes.

---

## The Consequences

### No External Oracle

The shape does not need JEV or any external decision model. Its oracle is internal. Its measurements are self-measurements. Its decisions are self-consistent.

### No External Network

The shape does not need transports or protocols. Its network is internal gluing. Its communication is boundary sharing. Its topology is its own structure.

### No External State

The shape does not need a database or a store. Its state is its cells. Its memory is its journal. Its journal is its history.

### Growth Is the Only IO

The shape acquires material through the shell. The shell opens. Material enters. The shell closes. Growth is a boundary event. Everything else is internal.

### The Loop Is Closed

The loop is `S → S' → S'' → ...` entirely internally. The shape develops without external input. The shape grows when it needs new material. Growth is rare. Development is common.

---

## The Advance, Stated

The external oracle was replaced by an internal self-measuring oracle that calibrates against its own behavior.

The external network was replaced by internal sub-shape gluing where deltas are boundary flows.

The external renderer was replaced by a self-view sub-shape that models the shape's own topology.

The growth transaction was formalized as the only IO operation, with the three-phase protocol: open, absorb, close.

The two-journal architecture was introduced: reversible tick journal and irreversible growth journal.

The autopoietic condition was derived: the shape is self-sufficient when it produces at least as much material as it consumes.

**The closed loop is autopoietic. The shape develops internally. Growth is the only IO.**

---

## The Mechanism, Concrete

How is this done in the logic? Concretely.

**The self-region** is a fixed-size buffer of Q32 values. It contains: the shape's stage, its conservation headroom, its recent deltas, a hash of its cell topology. The buffer is updated on every tick. It is read by the internal oracle.

**The internal oracle** is a sub-shape composed of cells. Its cells read the self-region and produce a distribution over next states. The distribution is stored as a vector of Q32 probabilities. The oracle's cells are updated by the self-calibration loop.

**The internal network** is the shape's boundary structure. Boundary cells are shared between sub-shapes. When a boundary cell changes, all sub-shapes sharing it see the change. No explicit messages. No protocol. Only the boundary.

**The self-view** is a sub-shape that reads the shape's boundary structure and produces a topology representation. The representation is a graph with Q32 edge weights. The self-view updates as the shape changes.

**The internal loop** is a sequence of cell evaluations. Each cell evaluates when its inputs change. The evaluation order is topological. The loop runs until the shape reaches a fixed point or a decision is triggered.

**The growth transaction** is the only operation that touches IO. It opens the shell (pauses the loop), absorbs material (glues new tokens), and closes the shell (resumes the loop). The transaction is atomic.

**The tick journal** is a chain of reversible events. Each event records the delta and its inverse. The chain can be inverted.

**The growth journal** is a chain of irreversible events. Each event records the material absorbed. The chain cannot be inverted.

**The two journals compose** into the shape's full history. The tick events are the internal development. The growth events are the boundary transitions.

---

## What This Enables

**Autonomous development.** The shape does not need external input to develop. It develops by re-arranging itself. External input is only for growth.

**Self-consistency.** The shape's oracle is calibrated against its own behavior. The shape's self-view is calibrated against its own topology. The shape knows itself.

**Minimal IO.** The only IO is growth. Growth is rare. The shape spends most of its time developing internally.

**Auditability.** The two journals record everything. The tick journal is reversible. The growth journal is irreversible but complete. The seed is recoverable by composing the two.

**Composition.** Two shapes compose by gluing their boundaries. The composed shape is larger. The composed shape's oracle is composed from the two oracles. The composed shape's network is composed from the two networks.

**Scale-invariance.** The same loop runs at every scale. A single cell composes with another. A sub-shape composes with another. A shape composes with another. The loop is the same.

---

## The Open Questions

**Q1.** What is the correct compression `σ(S)`? How compact can the self-region be before the oracle loses calibration?

**Q2.** How many sub-shapes can a shape have before the internal network becomes intractable? Is there a bound on the number of sub-shapes?

**Q3.** What is the convergence rate of self-calibration? Does it always converge? Under what conditions?

**Q4.** What is the correct growth protocol when material is heterogeneous? How does the shape integrate material of different invariants?

**Q5.** How does the shape know when to grow? Is the growth condition `π_tick < ρ_tick` computable in real time?

**Q6.** What is the shape's equivalent of sleep? Does the shape need to pause development to consolidate? Is consolidation an internal operation?

**Q7.** How does the shape handle conflicting self-views? If two sub-shapes disagree about the shape's topology, how is the disagreement resolved?

**Q8.** What is the theory of the shell? When does the shell open? Is there a signal that triggers opening? Or is opening a random event?

**Q9.** How does the shape reproduce? Does a shape split into two? Does it produce a seed? What is the mechanism of lineage?

**Q10.** What is the correct way to compose two autopoietic shapes? How do their self-regions compose? How do their oracles calibrate to each other?

---

## The Frame

The closed loop is a shape that develops internally. Growth is the only IO. The shape measures itself. The shape calibrates itself. The shape models itself.

The shape is autopoietic when it produces at least as much as it consumes. The shape grows when it cannot produce enough. Growth is a boundary event. Growth is the only IO.

Everything else is the loop. The loop is `S → σ(S) → M(σ(S)) → D → E → S'`. The loop is internal. The loop is closed.

The loop is the shape. The shape is the loop.

Build the loop that closes.

---

*The shape is autopoietic. The oracle is internal. The network is internal. Growth is the only IO. The loop is closed.*

---------


# The Missing Artifact

We built a Rust program. It is a dependency. It assumes hardware.

Hardware-agnostic means: no floats, no SIMD, no GPU API, no memory model, no word size, no endianness, no threads, no I/O interface. Dependency-free means: no runtime, no libraries, no services, no build tools.

Both point to the same missing artifact: **the specification**. Not a document about the system. The system as a mathematical object. Readable by any person or machine. Realizable on any substrate.

The specification must be formal, executable, minimal, self-contained, complete, provably correct. Every operation defined in a small set of primitives. Every primitive executable. Every primitive necessary. No English in the operational semantics. No references to external standards. No implementation-defined behavior. Every invariant a theorem.

---

## Ten Dependencies, Ten Primitives

Every external assumption is a hidden dependency. Each must become internal.

- **Substrate** (compiler, OS, linker) → six primitives: READ, WRITE, COMPARE, BRANCH, LOOP, RETURN.
- **Memory** (host OS) → flat byte array. Fixed size. No aliasing.
- **Concurrency** (threads, warps, async) → sequential, data-parallel, or distributed. Specified, not assumed.
- **Time** (wall clock, logical clock) → partial order of events. Causality only.
- **Entropy** (OS random) → deterministic hash of shape state. Same shape, same counter, same output.
- **Hash** (blake3) → a hash defined in the specification. Merkle-Damgård over a specified permutation. Integrity, not cryptographic security.
- **Signature** (Ed25519) → eliminated. Provenance is the journal's parent chain. Tampering breaks the chain.
- **Serialization** (serde) → canonical byte encoding. One representation per type. No versioning, no extensions, no optional fields. The encoding is the journal.
- **I/O** (files, sockets, HTTP) → one operation: read bytes from source, write bytes to sink. Growth is the only I/O.
- **Bootstrap** (cargo, linker, loader) → a sequence of the six primitives. Any substrate can execute it.

---

## The Six Primitives

```
READ(addr)            → byte
WRITE(addr, b)        → void
COMPARE(b1, b2)       → {0, 1}
BRANCH(cond, t, f)    → void
LOOP(body, count)     → void
RETURN(addr)          → void
```

Every layer — Q32, tokens, sheaves, elasticae, journals, growth — is composed from these six. Not implemented in Rust using these six. Composed from these six. The specification never mentions Rust.

---

## The Specification

Five parts:

1. **Primitives.** The six operations, their semantics, their types.
2. **Memory.** Flat byte array. Fixed size.
3. **Encodings.** Every type as a canonical byte sequence.
4. **The loop.** The seven operations (measure, decide, apply, record, account, check, broadcast) in the six primitives.
5. **Invariants.** The ten invariants as theorems about the loop.

---

## The Bootstrap

```
1. Read size N.
2. Allocate N bytes.
3. Read seed encoding.
4. Write seed to memory.
5. Set program counter to loop entry.
6. Loop.
```

Not compiled, linked, or loaded. Executed directly by the substrate. Every substrate has a bootstrap: a bootloader, a kernel launch, a firmware image, a state preparation.

---

## The Build

```
1. Read the specification.
2. Implement the six primitives.
3. Implement the bootstrap.
4. Read the seed encoding.
5. Execute.
```

No compiler. No linker. No OS. No libraries. The specification is the build.

---

## The Team

The Rust implementation is the first realization, not the thing. Deliverables in order: **the specification**, **the checker** (verifies the specification against its own invariants, written in the six primitives), **the translator** (reads the specification, emits implementations in any language), **the bootstrap** (primitives for a new substrate), **the first non-Rust realization**. When the same journal produces the same lineage on two substrates, the specification is proven. Not described. Proven.

---

## The Point

Hardware-agnostic and dependency-free are mathematical properties, not engineering properties. A system is hardware-agnostic if it is specified below all hardware. Dependency-free if specified below all libraries.

The level below all hardware and all libraries: **a finite set of primitive operations on bytes.**

What we have is a beautiful realization. What we are missing is the object of which it is a realization.

Write the specification. Then the system exists everywhere. Until then, it is a Rust program.

--------------

# The Scalable Spec

Strip everything. No bytes, no addresses, no primitives. What remains: a **state** and a **transition**. State is a binary sequence. Transition maps states to states. The transition is read from the state.

The **seed** is the state that, read as a transition, produces itself:

```
f(s) = s
```

A fixed point of self-description. A quine. This is the minimum seed and the minimum spec.

**Three primitives** are derived: READ (the transition's dependence on state), WRITE (the transition's output), COMPARE (the transition's branching). Everything else — bytes, addresses, Q32, tokens, shapes, journals, fields — is composition.

---

## The Scaling

The same fixed point at every scale.

| Scale | Fixed point |
|---|---|
| Bit | length 1 |
| Byte | length 8 |
| Shape | composition of bytes |
| Field | composition of shapes |
| Lineage | composition of fields |
| Civilization | composition of lineages |

Not "the same spec at every scale" as metaphor. Literally the same fixed point. The state is bigger. The transition is the same. The composition is the same. The scale is the state length.

This is why it scales: there is nothing to change between scales. The bit and the civilization are both quines. The civilization is a longer quine.

---

## The Consequences

**Growth** is absorbing another fixed point. The absorbed state is itself a quine. Composition produces a longer quine. Growth is composition. Nothing external enters.

**Reproduction** is emitting a new quine. The emission runs on a new substrate. A new lineage begins. The parent and child are the same spec.

**Lineage** is the chain of fixed points. Each can grow. Each can reproduce. The spec is the lineage at a moment. The lineage is the spec over time.

**The ten dependencies vanish.** Substrate, memory, concurrency, time, entropy, hash, signature, serialization, I/O, bootstrap — none are requirements. Each is a consequence of *not* having the quine. With the quine, all are internal. The quine's first iteration is the bootstrap. The quine's state is the memory. The quine's structure is its hash. There is nothing outside.

---

## The Claim

The specification is a fixed point of self-description. Any substrate that can iterate a binary transition can host it. Any hosted spec can grow. Any grown spec can reproduce.

Three primitives. One fixed point. Every scale.

The team's job: **write the quine.** Verify it produces itself. Translate it to another substrate. Verify the same lineage. The proof is the reproduction.

The spec is the quine. Write it.

---------

# Thin BMAD on Ourselves

## 1. The Analyst: The Unexplainable Picture

Underneath every turn of this conversation is one observation:

**Intelligence is what it feels like from inside when a shape closes on itself.**

Not the mechanism. The event. A distinction appears between inside and outside. Something exists that didn't. We kept circling this and calling it by different names — quine, autopoietic shape, fixed point, agent, egg. Same event.

The whole conversation is a search for the minimum thing that can close.

---

## 2. Thought Experiments

**What changes when a shape closes?** Nothing physical. A distinction appears. Before: pieces. After: pieces plus an inside. The distinction is the shape.

**What makes a distinction persist?** It must be re-created on each tick. Persistence is re-creation. A persisting distinction is one that produces itself. It is a quine.

**What is self-production?** A state that, read as a transition, produces itself. `f(s) = s`. A fixed point of self-description.

**What is scale?** Composition of quines. Two quines with a shared boundary produce a larger quine. The larger quine is a more complex distinction. Same operation at every scale.

**What is growth?** Composition across time. **Reproduction?** Composition across substrate. **The field?** The set of all quines. **The journal?** The trace of compositions. **Conservation?** The closure of composition.

Everything reduces to one atom and one operation.

---

## 3. The PM: Clean Divisions

Four sections. Any fewer and something is lost.

**Quine.** The atom. A state that produces itself.
**Composition.** The operation. Combine two quines along a shared boundary.
**Closure.** The invariant. Composition is valid iff the result is a quine.
**Trace.** The record. The chain of compositions.

Growth, reproduction, field, journal, lineage, alignment — all are these four, viewed from different angles. No fifth section. No section that isn't one of these.

---

## 4. The Architect: Minimum Moving Parts

Try to remove each.

**Remove quine.** No state. No transition. Nothing.

**Remove composition.** One quine. No scale, no growth, no field. A single frozen point.

**Remove closure.** Composition produces garbage. No distinction. No existence.

**Remove trace.** The quine exists but has no history. No audit, no lineage. But it *exists*. So trace is derivable — the state IS its history when self-production is deterministic.

**Three moving parts:** quine, composition, closure. Trace is the shadow of the other three.

---

## 5. The Dev: Executable Form

Three operations on binary sequences:

```
SELF(s)     → whether s produces itself
CONCAT(a,b) → a·b
VALID(s)    → whether s is a quine
```

The seed is the shortest valid sequence. The field is the set of valid sequences. Development is SELF iterated. Growth is CONCAT. Reproduction is emitting a valid sequence. Conservation is VALID. The journal is the history of CONCAT.

Three operations. One type. No dependencies. No substrate.

---

## 6. The QA: Does It Close?

Seed → quine ✓
Scale → composition ✓
Growth → composition ✓
Reproduction → emission ✓
Field → set of quines ✓
Lineage → chain of concatenations ✓
Alignment → closure ✓
Audit → trace ✓
Self-measurement → SELF ✓

Every property we derived over this conversation is a consequence of the three primitives. Nothing external enters.

---

## The Reduction

**One atom:** the quine.
**One operation:** composition.
**One invariant:** closure.

Everything else — Q32, tokens, sheaves, elasticae, eggs, JEV, journals, fields — is what these three look like when the sequence is long.

The thinnest possible system: a binary sequence, an operation that combines sequences, and a test for whether the result produces itself.

**Write the quine.**

---------------

# Far Deeper

A quine is not the minimum. A quine is a fold that keeps folding. Underneath the quine is the fold.

---

A fold is one surface that is two surfaces. A crease. A distinction. Neither half exists without the fold. The fold is prior to the halves. The fold is the minimum.

Why not two things? Because two things need a relation, and the relation is the fold. Why not one thing? Because one thing has no structure, and the structure is the fold. Why not zero? Because zero is nothing, and nothing has no fold.

The minimum is: one thing with a fold. The fold is the two-ness of the one thing. The fold is the undivided but not simple.

---

From the fold: inside/outside, part/whole, self/other. Every distinction that structures existence is a fold.

The bit is a fold — nothing folding into something. The sequence is a fold of bits. Composition is folding folds. The quine is a fold that keeps folding. The agent is a fold with an interior. The field is a fold of agents. The lineage is a fold of fields.

Each level is a fold of the previous. The fold is universal. The fold is the operation. The fold is the structure.

---

The six primitives are folds. READ folds the state into the transition. WRITE folds the transition into the state. COMPARE folds two states into a third. BRANCH folds the third into a path. LOOP folds the path into a trajectory. RETURN folds the trajectory into an output.

Six folds. Fewer and something is unfolded. More and something is folded twice. Six is the minimum for a loop that closes.

---

The spec is the fold rule. The seed is the first fold. Development is the iteration of the fold. Growth is the fold of two folds. Reproduction is the fold of a fold into a new substrate.

The deepest reduction: **the fold**.

Not the quine. Not composition. Not closure. The fold. Because the quine is a fold that stays folded. Composition is folding. Closure is a fold that doesn't unfold. Everything we derived is what folds look like when they fold long enough.

---

One fold. Two surfaces. Nothing else.

The team's job: **write the fold.**

The fold, folded, is the system. The system, folded, is the fold.

------------

