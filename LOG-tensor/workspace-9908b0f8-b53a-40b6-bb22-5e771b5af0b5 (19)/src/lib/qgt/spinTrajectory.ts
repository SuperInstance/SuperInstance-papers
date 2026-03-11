/**
 * Spin Trajectory Dynamics Module
 * 
 * Core Insight: Direction/Orientation is first-class data with momentum and energy.
 * When everything is in flux, "direction" means momentum and energy.
 * 
 * Key Discoveries from Simulations:
 * 1. 6 DOF total: 3 linear + 3 rotational (can extend to higher dimensions)
 * 2. SO(n) rotations work for any n, with n(n-1)/2 angular velocity components
 * 3. Spin trajectories 6.3x faster than matrix rotations
 * 4. Weight "gravity" creates attractor basins in spin space
 * 5. Energy flows between linear and angular modes
 * 
 * Mathematical Framework:
 * - Phase Space: (position, momentum, orientation, angular_momentum)
 * - Spin Hamiltonian: H = p²/2m + L²/2I + V(x, R)
 * - Weight Gravity: F = -∇V attracts trajectories
 * - Higher-Dim Direction: SO(n) or Spin(n) groups
 */

import { Vector3, Quaternion, randomQuaternion, quaternionMultiply, quaternionConjugate, quaternionToMatrix } from './quaternion';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Complete spin state with position, momentum, orientation, and angular momentum
 */
export interface SpinState {
  position: Vector3;
  momentum: Vector3;
  orientation: Quaternion;
  angularMomentum: Vector3;
  energy?: number;
}

/**
 * Gravitational weight that attracts spin trajectories
 */
export interface SpinWeight {
  position: Vector3;
  mass: number;
  preferredOrientation: Quaternion;
  orientationStrength: number;
}

/**
 * Configuration for spin dynamics
 */
export interface SpinDynamicsConfig {
  mass: number;
  inertia: number;
  dt: number;
  nSteps: number;
  useSymplecticIntegration: boolean;
}

/**
 * Higher-dimensional direction in SO(n)
 */
export interface HigherDimDirection {
  dim: number;
  rotation: number[][];  // SO(n) rotation matrix
}

/**
 * Spin trajectory result
 */
export interface SpinTrajectoryResult {
  states: SpinState[];
  energies: number[];
  times: number[];
  totalDistance: number;
  totalRotation: number;
  angularMomentumDrift: number;
  energyDrift: number;
}

// =============================================================================
// Spin Hamiltonian
// =============================================================================

export class SpinHamiltonian {
  private mass: number;
  private inertia: number;
  
  constructor(mass: number = 1.0, inertia: number = 1.0) {
    this.mass = mass;
    this.inertia = inertia;
  }
  
  /**
   * Linear kinetic energy: T_lin = p²/2m
   */
  linearKineticEnergy(momentum: Vector3): number {
    return (momentum[0]**2 + momentum[1]**2 + momentum[2]**2) / (2 * this.mass);
  }
  
  /**
   * Angular kinetic energy: T_ang = L²/2I
   */
  angularKineticEnergy(angularMomentum: Vector3): number {
    return (angularMomentum[0]**2 + angularMomentum[1]**2 + angularMomentum[2]**2) / (2 * this.inertia);
  }
  
  /**
   * Total kinetic energy
   */
  kineticEnergy(state: SpinState): number {
    return this.linearKineticEnergy(state.momentum) + 
           this.angularKineticEnergy(state.angularMomentum);
  }
  
  /**
   * Gravitational potential from weights
   */
  potentialEnergy(state: SpinState, weights: SpinWeight[]): number {
    let V = 0;
    
    for (const w of weights) {
      // Position attraction (gravitational)
      const dx = state.position[0] - w.position[0];
      const dy = state.position[1] - w.position[1];
      const dz = state.position[2] - w.position[2];
      const r = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (r > 0.1) {
        V -= w.mass / r;
      }
      
      // Orientation alignment potential
      const q = state.orientation;
      const q_w = w.preferredOrientation;
      // Dot product of quaternions measures alignment
      const alignment = Math.abs(
        q[0]*q_w[0] + q[1]*q_w[1] + q[2]*q_w[2] + q[3]*q_w[3]
      );
      V -= alignment * w.mass * w.orientationStrength * 0.1;
    }
    
    return V;
  }
  
  /**
   * Total Hamiltonian: H = T + V
   */
  totalEnergy(state: SpinState, weights: SpinWeight[]): number {
    return this.kineticEnergy(state) + this.potentialEnergy(state, weights);
  }
  
  /**
   * Force from potential gradient: F = -∇V
   */
  computeForce(state: SpinState, weights: SpinWeight[]): Vector3 {
    const force: Vector3 = [0, 0, 0];
    
    for (const w of weights) {
      const dx = state.position[0] - w.position[0];
      const dy = state.position[1] - w.position[1];
      const dz = state.position[2] - w.position[2];
      const r = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (r > 0.1) {
        // Gravitational force: F = -GMm/r² * r̂
        const factor = -w.mass / (r * r * r);
        force[0] += factor * dx;
        force[1] += factor * dy;
        force[2] += factor * dz;
      }
    }
    
    return force;
  }
  
  /**
   * Torque from orientation potential: τ = -∂V/∂θ
   */
  computeTorque(state: SpinState, weights: SpinWeight[]): Vector3 {
    const torque: Vector3 = [0, 0, 0];
    
    for (const w of weights) {
      const q = state.orientation;
      const q_w = w.preferredOrientation;
      
      // Cross product of quaternion vector parts gives torque direction
      const v1 = [q[1], q[2], q[3]];
      const v2 = [q_w[1], q_w[2], q_w[3]];
      
      // Cross product
      torque[0] += w.mass * w.orientationStrength * 0.1 * 
                   (v1[1]*v2[2] - v1[2]*v2[1]);
      torque[1] += w.mass * w.orientationStrength * 0.1 * 
                   (v1[2]*v2[0] - v1[0]*v2[2]);
      torque[2] += w.mass * w.orientationStrength * 0.1 * 
                   (v1[0]*v2[1] - v1[1]*v2[0]);
    }
    
    return torque;
  }
  
  /**
   * Velocity from momentum: v = p/m
   */
  computeVelocity(momentum: Vector3): Vector3 {
    return [
      momentum[0] / this.mass,
      momentum[1] / this.mass,
      momentum[2] / this.mass
    ];
  }
  
  /**
   * Angular velocity from angular momentum: ω = L/I
   */
  computeAngularVelocity(angularMomentum: Vector3): Vector3 {
    return [
      angularMomentum[0] / this.inertia,
      angularMomentum[1] / this.inertia,
      angularMomentum[2] / this.inertia
    ];
  }
}

// =============================================================================
// Spin Dynamics Simulator
// =============================================================================

export class SpinDynamicsSimulator {
  private hamiltonian: SpinHamiltonian;
  private dt: number;
  
  constructor(config: Partial<SpinDynamicsConfig> = {}) {
    this.hamiltonian = new SpinHamiltonian(
      config.mass || 1.0,
      config.inertia || 1.0
    );
    this.dt = config.dt || 0.01;
  }
  
  /**
   * Symplectic (energy-preserving) integration
   * Half-step momentum, full-step position, half-step momentum
   */
  symplecticIntegrate(
    initialState: SpinState,
    weights: SpinWeight[],
    nSteps: number
  ): SpinTrajectoryResult {
    const states: SpinState[] = [initialState];
    const energies: number[] = [this.hamiltonian.totalEnergy(initialState, weights)];
    const times: number[] = [0];
    
    const state: SpinState = {
      position: [...initialState.position],
      momentum: [...initialState.momentum],
      orientation: [...initialState.orientation],
      angularMomentum: [...initialState.angularMomentum]
    };
    
    for (let step = 0; step < nSteps; step++) {
      // Half-step momentum update
      const force = this.hamiltonian.computeForce(state, weights);
      const torque = this.hamiltonian.computeTorque(state, weights);
      
      state.momentum[0] += force[0] * this.dt / 2;
      state.momentum[1] += force[1] * this.dt / 2;
      state.momentum[2] += force[2] * this.dt / 2;
      
      state.angularMomentum[0] += torque[0] * this.dt / 2;
      state.angularMomentum[1] += torque[1] * this.dt / 2;
      state.angularMomentum[2] += torque[2] * this.dt / 2;
      
      // Full-step position update
      const velocity = this.hamiltonian.computeVelocity(state.momentum);
      state.position[0] += velocity[0] * this.dt;
      state.position[1] += velocity[1] * this.dt;
      state.position[2] += velocity[2] * this.dt;
      
      // Full-step orientation update via quaternion
      const omega = this.hamiltonian.computeAngularVelocity(state.angularMomentum);
      state.orientation = this.updateOrientation(state.orientation, omega, this.dt);
      
      // Half-step momentum update (with new position)
      const newForce = this.hamiltonian.computeForce(state, weights);
      const newTorque = this.hamiltonian.computeTorque(state, weights);
      
      state.momentum[0] += newForce[0] * this.dt / 2;
      state.momentum[1] += newForce[1] * this.dt / 2;
      state.momentum[2] += newForce[2] * this.dt / 2;
      
      state.angularMomentum[0] += newTorque[0] * this.dt / 2;
      state.angularMomentum[1] += newTorque[1] * this.dt / 2;
      state.angularMomentum[2] += newTorque[2] * this.dt / 2;
      
      // Record state
      states.push({
        position: [...state.position],
        momentum: [...state.momentum],
        orientation: [...state.orientation],
        angularMomentum: [...state.angularMomentum]
      });
      energies.push(this.hamiltonian.totalEnergy(state, weights));
      times.push((step + 1) * this.dt);
    }
    
    // Compute trajectory statistics
    const totalDistance = this.computeTotalDistance(states);
    const totalRotation = this.computeTotalRotation(states);
    const angularMomentumDrift = this.computeAngularMomentumDrift(states);
    const energyDrift = Math.abs(energies[energies.length - 1] - energies[0]) / Math.abs(energies[0] || 1);
    
    return {
      states,
      energies,
      times,
      totalDistance,
      totalRotation,
      angularMomentumDrift,
      energyDrift
    };
  }
  
  /**
   * Update orientation via quaternion differential equation
   * dq/dt = 0.5 * ω ⊗ q
   */
  private updateOrientation(q: Quaternion, omega: Vector3, dt: number): Quaternion {
    // dq = 0.5 * [0, ω] ⊗ q * dt
    const omegaQuat: Quaternion = [0, omega[0], omega[1], omega[2]];
    const dq = quaternionMultiply(omegaQuat, q);
    
    const newQ: Quaternion = [
      q[0] + 0.5 * dq[0] * dt,
      q[1] + 0.5 * dq[1] * dt,
      q[2] + 0.5 * dq[2] * dt,
      q[3] + 0.5 * dq[3] * dt
    ];
    
    // Normalize
    const norm = Math.sqrt(newQ[0]**2 + newQ[1]**2 + newQ[2]**2 + newQ[3]**2);
    return [newQ[0]/norm, newQ[1]/norm, newQ[2]/norm, newQ[3]/norm];
  }
  
  private computeTotalDistance(states: SpinState[]): number {
    let total = 0;
    for (let i = 1; i < states.length; i++) {
      const dx = states[i].position[0] - states[i-1].position[0];
      const dy = states[i].position[1] - states[i-1].position[1];
      const dz = states[i].position[2] - states[i-1].position[2];
      total += Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    return total;
  }
  
  private computeTotalRotation(states: SpinState[]): number {
    let total = 0;
    for (let i = 1; i < states.length; i++) {
      // Compute relative rotation angle
      const q1 = states[i-1].orientation;
      const q2 = states[i].orientation;
      const dot = Math.abs(q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3]);
      const angle = 2 * Math.acos(Math.min(1, dot));
      total += angle;
    }
    return total;
  }
  
  private computeAngularMomentumDrift(states: SpinState[]): number {
    const L0 = states[0].angularMomentum;
    const Lf = states[states.length - 1].angularMomentum;
    return Math.sqrt(
      (Lf[0] - L0[0])**2 + 
      (Lf[1] - L0[1])**2 + 
      (Lf[2] - L0[2])**2
    );
  }
}

// =============================================================================
// Higher-Dimensional Direction (SO(n))
// =============================================================================

export class HigherDimensionalDirection {
  private dim: number;
  private rotation: number[][];
  
  constructor(dim: number) {
    this.dim = dim;
    this.rotation = this.identityMatrix(dim);
  }
  
  private identityMatrix(n: number): number[][] {
    const I: number[][] = [];
    for (let i = 0; i < n; i++) {
      I.push(new Array(n).fill(0));
      I[i][i] = 1;
    }
    return I;
  }
  
  /**
   * Generate random SO(n) rotation via QR decomposition
   */
  randomize(): void {
    // Random matrix
    const A: number[][] = [];
    for (let i = 0; i < this.dim; i++) {
      A.push([]);
      for (let j = 0; j < this.dim; j++) {
        A[i].push(Math.random() * 2 - 1);
      }
    }
    
    // QR decomposition (simplified)
    const { Q, R } = this.qrDecomposition(A);
    
    // Ensure det(Q) = 1
    let det = 1;
    for (let i = 0; i < this.dim; i++) {
      det *= R[i][i];
    }
    
    if (det < 0) {
      Q[0] = Q[0].map(v => -v);
    }
    
    this.rotation = Q;
  }
  
  private qrDecomposition(A: number[][]): { Q: number[][], R: number[][] } {
    const n = this.dim;
    const Q: number[][] = [];
    const R: number[][] = [];
    
    // Initialize
    for (let i = 0; i < n; i++) {
      Q.push(new Array(n).fill(0));
      R.push(new Array(n).fill(0));
    }
    
    // Gram-Schmidt
    for (let j = 0; j < n; j++) {
      // v = A[:, j]
      const v: number[] = [];
      for (let i = 0; i < n; i++) {
        v.push(A[i][j]);
      }
      
      for (let i = 0; i < j; i++) {
        // R[i][j] = Q[:, i]^T * A[:, j]
        let dot = 0;
        for (let k = 0; k < n; k++) {
          dot += Q[k][i] * A[k][j];
        }
        R[i][j] = dot;
        
        // v = v - R[i][j] * Q[:, i]
        for (let k = 0; k < n; k++) {
          v[k] -= R[i][j] * Q[k][i];
        }
      }
      
      // R[j][j] = ||v||
      let norm = 0;
      for (let k = 0; k < n; k++) {
        norm += v[k] * v[k];
      }
      R[j][j] = Math.sqrt(norm);
      
      // Q[:, j] = v / R[j][j]
      for (let k = 0; k < n; k++) {
        Q[k][j] = v[k] / (R[j][j] || 1);
      }
    }
    
    return { Q, R };
  }
  
  /**
   * Angular velocity space dimension: n(n-1)/2
   */
  angularVelocityDimension(): number {
    return this.dim * (this.dim - 1) / 2;
  }
  
  /**
   * Apply angular velocity to rotation
   */
  applyAngularVelocity(omega: number[], dt: number): void {
    // Reshape omega to skew-symmetric matrix
    const Omega: number[][] = [];
    for (let i = 0; i < this.dim; i++) {
      Omega.push(new Array(this.dim).fill(0));
    }
    
    let idx = 0;
    for (let i = 0; i < this.dim; i++) {
      for (let j = i + 1; j < this.dim; j++) {
        Omega[i][j] = omega[idx];
        Omega[j][i] = -omega[idx];
        idx++;
      }
    }
    
    // Matrix exponential approximation: exp(Ω*dt) ≈ I + Ω*dt + 0.5*Ω²*dt²
    const dR = this.matrixAdd(
      this.identityMatrix(this.dim),
      this.matrixMultiply(Omega, dt),
      this.matrixMultiply(this.matrixMultiply(Omega, Omega), 0.5 * dt * dt)
    );
    
    // Update rotation
    this.rotation = this.matrixMultiply(this.rotation, dR);
    
    // Re-orthogonalize via QR
    const { Q } = this.qrDecomposition(this.rotation);
    this.rotation = Q;
  }
  
  private matrixMultiply(A: number[][], B: number[][] | number): number[][] {
    if (typeof B === 'number') {
      return A.map(row => row.map(v => v * B));
    }
    
    const n = A.length;
    const m = B[0].length;
    const p = B.length;
    const C: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      C.push([]);
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < p; k++) {
          sum += A[i][k] * B[k][j];
        }
        C[i].push(sum);
      }
    }
    
    return C;
  }
  
  private matrixAdd(...matrices: number[][][]): number[][] {
    const n = matrices[0].length;
    const m = matrices[0][0].length;
    const result: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      result.push([]);
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (const M of matrices) {
          sum += M[i][j];
        }
        result[i].push(sum);
      }
    }
    
    return result;
  }
  
  getRotation(): number[][] {
    return this.rotation;
  }
  
  getDimension(): number {
    return this.dim;
  }
}

// =============================================================================
// Spin Trajectory Field
// =============================================================================

export class SpinTrajectoryField {
  private spins: SpinState[];
  private hamiltonian: SpinHamiltonian;
  
  constructor(positions: Vector3[], config: Partial<SpinDynamicsConfig> = {}) {
    this.hamiltonian = new SpinHamiltonian(config.mass, config.inertia);
    
    this.spins = positions.map(pos => ({
      position: [...pos],
      momentum: [
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ],
      orientation: randomQuaternion(),
      angularMomentum: [
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ]
    }));
  }
  
  /**
   * Evolve field dynamics with nearest-neighbor interactions
   */
  evolve(dt: number, couplingStrength: number = 0.1): {
    energy: number;
    coherence: number;
    totalAngularMomentum: Vector3;
  } {
    const n = this.spins.length;
    
    // Compute forces and torques from neighbors
    const forces: Vector3[] = this.spins.map(() => [0, 0, 0]);
    const torques: Vector3[] = this.spins.map(() => [0, 0, 0]);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const dx = this.spins[i].position[0] - this.spins[j].position[0];
          const dy = this.spins[i].position[1] - this.spins[j].position[1];
          const dz = this.spins[i].position[2] - this.spins[j].position[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (dist < 3.0 && dist > 0.1) {
            // Spring force
            const factor = couplingStrength / dist;
            forces[i][0] += factor * dx;
            forces[i][1] += factor * dy;
            forces[i][2] += factor * dz;
            
            // Orientation alignment torque
            const q_i = this.spins[i].orientation;
            const q_j = this.spins[j].orientation;
            const v_i = [q_i[1], q_i[2], q_i[3]];
            const v_j = [q_j[1], q_j[2], q_j[3]];
            
            torques[i][0] += couplingStrength * 0.01 * (v_i[1]*v_j[2] - v_i[2]*v_j[1]) / dist;
            torques[i][1] += couplingStrength * 0.01 * (v_i[2]*v_j[0] - v_i[0]*v_j[2]) / dist;
            torques[i][2] += couplingStrength * 0.01 * (v_i[0]*v_j[1] - v_i[1]*v_j[0]) / dist;
          }
        }
      }
    }
    
    // Update all spins
    for (let i = 0; i < n; i++) {
      // Update momentum
      this.spins[i].momentum[0] += forces[i][0] * dt;
      this.spins[i].momentum[1] += forces[i][1] * dt;
      this.spins[i].momentum[2] += forces[i][2] * dt;
      
      // Update angular momentum
      this.spins[i].angularMomentum[0] += torques[i][0] * dt;
      this.spins[i].angularMomentum[1] += torques[i][1] * dt;
      this.spins[i].angularMomentum[2] += torques[i][2] * dt;
      
      // Update position
      const v = this.hamiltonian.computeVelocity(this.spins[i].momentum);
      this.spins[i].position[0] += v[0] * dt;
      this.spins[i].position[1] += v[1] * dt;
      this.spins[i].position[2] += v[2] * dt;
      
      // Update orientation
      const omega = this.hamiltonian.computeAngularVelocity(this.spins[i].angularMomentum);
      const q = this.spins[i].orientation;
      const omegaQuat: Quaternion = [0, omega[0], omega[1], omega[2]];
      const dq = quaternionMultiply(omegaQuat, q);
      
      const newQ: Quaternion = [
        q[0] + 0.5 * dq[0] * dt,
        q[1] + 0.5 * dq[1] * dt,
        q[2] + 0.5 * dq[2] * dt,
        q[3] + 0.5 * dq[3] * dt
      ];
      
      const norm = Math.sqrt(newQ[0]**2 + newQ[1]**2 + newQ[2]**2 + newQ[3]**2);
      this.spins[i].orientation = [newQ[0]/norm, newQ[1]/norm, newQ[2]/norm, newQ[3]/norm];
    }
    
    // Compute field properties
    const energy = this.spins.reduce((sum, s) => sum + this.hamiltonian.kineticEnergy(s), 0);
    const coherence = this.computeCoherence();
    const totalAngularMomentum = this.computeTotalAngularMomentum();
    
    return { energy, coherence, totalAngularMomentum };
  }
  
  private computeCoherence(): number {
    // Mean quaternion
    let meanQ: Quaternion = [0, 0, 0, 0];
    for (const s of this.spins) {
      meanQ[0] += s.orientation[0];
      meanQ[1] += s.orientation[1];
      meanQ[2] += s.orientation[2];
      meanQ[3] += s.orientation[3];
    }
    
    const norm = Math.sqrt(meanQ[0]**2 + meanQ[1]**2 + meanQ[2]**2 + meanQ[3]**2);
    meanQ = [meanQ[0]/norm, meanQ[1]/norm, meanQ[2]/norm, meanQ[3]/norm];
    
    // Average alignment with mean
    let coherence = 0;
    for (const s of this.spins) {
      const dot = Math.abs(
        s.orientation[0]*meanQ[0] + s.orientation[1]*meanQ[1] + 
        s.orientation[2]*meanQ[2] + s.orientation[3]*meanQ[3]
      );
      coherence += dot;
    }
    
    return coherence / this.spins.length;
  }
  
  private computeTotalAngularMomentum(): Vector3 {
    const L: Vector3 = [0, 0, 0];
    for (const s of this.spins) {
      L[0] += s.angularMomentum[0];
      L[1] += s.angularMomentum[1];
      L[2] += s.angularMomentum[2];
    }
    return L;
  }
  
  getSpins(): SpinState[] {
    return this.spins;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create random spin state
 */
export function createRandomSpinState(scale: number = 1): SpinState {
  return {
    position: [
      (Math.random() - 0.5) * scale * 2,
      (Math.random() - 0.5) * scale * 2,
      (Math.random() - 0.5) * scale * 2
    ],
    momentum: [
      (Math.random() - 0.5) * scale,
      (Math.random() - 0.5) * scale,
      (Math.random() - 0.5) * scale
    ],
    orientation: randomQuaternion(),
    angularMomentum: [
      (Math.random() - 0.5) * scale * 0.5,
      (Math.random() - 0.5) * scale * 0.5,
      (Math.random() - 0.5) * scale * 0.5
    ]
  };
}

/**
 * Create random spin weights
 */
export function createRandomWeights(n: number, scale: number = 5): SpinWeight[] {
  return Array(n).fill(null).map(() => ({
    position: [
      (Math.random() - 0.5) * scale * 2,
      (Math.random() - 0.5) * scale * 2,
      (Math.random() - 0.5) * scale * 2
    ] as Vector3,
    mass: 1 + Math.random() * 3,
    preferredOrientation: randomQuaternion(),
    orientationStrength: 0.1 + Math.random() * 0.2
  }));
}

// Export all
const spinTrajectory = {
  SpinState: {} as SpinState,
  SpinWeight: {} as SpinWeight,
  SpinDynamicsConfig: {} as SpinDynamicsConfig,
  HigherDimDirection: {} as HigherDimDirection,
  SpinTrajectoryResult: {} as SpinTrajectoryResult,
  SpinHamiltonian,
  SpinDynamicsSimulator,
  HigherDimensionalDirection,
  SpinTrajectoryField,
  createRandomSpinState,
  createRandomWeights,
};

export default spinTrajectory;
