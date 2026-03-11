# Biological Learning Research: Non-Cognitive Learning Systems

**Agent BIORA (BIological Observation and Reactive Adaptation)**  
**Research Domain: Neuroscience, Biomechanics, Embodied Cognition**  
**Date: 2025-01-19**

---

## Executive Summary

This research document explores learning mechanisms that operate below conscious awareness—systems that "know" without "thinking." These biological processes offer profound insights for designing artificial systems that learn stability, balance, and pattern recognition without explicit symbolic computation.

---

## 1. Proprioceptive Learning

### 1.1 The Body's Silent Knowledge

Proprioception—often called the "sixth sense"—enables organisms to learn balance and motor coordination without conscious deliberation. This system operates continuously, processing ~10^6 bits of sensory data per second while conscious awareness handles only ~50 bits/second.

#### Core Mechanisms

**Muscle Spindles (Intrafusal Fibers)**
- Embedded within muscle bellies (extrafusal fibers)
- Detect stretch velocity and length changes
- Primary endings (Ia afferents): Sense velocity and static length
- Secondary endings (II afferents): Sense static length primarily
- Sensitivity adjusted via gamma motor neuron activation
- Feedback loop time: 20-40ms (faster than conscious reaction)

**Golgi Tendon Organs (GTOs)**
- Located at muscle-tendon junctions
- Detect tension/force (not length)
- Ib afferents signal force to spinal cord
- Originally thought to be purely protective (preventing overload)
- Now understood as critical for fine force regulation
- Enable precise grip force scaling without visual feedback

**Joint Receptors**
- Ruffini endings: Detect joint position and movement
- Pacinian corpuscles: Detect vibration and pressure changes
- Found in joint capsules and ligaments
- Contribute to position sense, especially at end ranges

### 1.2 Sensorimotor Loops Below Conscious Awareness

#### The Stretch Reflex Arc
```
Muscle stretch → Muscle spindle activation → Ia afferent → 
Spinal cord (monosynaptic) → Alpha motor neuron → 
Muscle contraction (resistance to stretch)
```

**Latency:** ~25-50ms  
**Conscious perception latency:** ~200-500ms

This 4-10x speed advantage means postural corrections occur before we're aware of the perturbation.

#### Long-Loop Reflexes
- Involve cortical processing but remain automatic
- Latency: ~50-100ms
- Allow context-appropriate modifications
- Enable "learning" appropriate responses to specific situations

#### Central Pattern Generators (CPGs)
- Spinal cord neural circuits that generate rhythmic movements
- Operate without supraspinal input (demonstrated in decerebrate cats)
- Learn and adapt through proprioceptive feedback
- Examples: Locomotion, breathing, chewing

### 1.3 Learning Balance Without "Thinking"

#### The Unconscious Calculus
The body solves complex inverse dynamics problems continuously:
- Given desired position → compute required muscle activations
- Given current perturbation → compute corrective torques
- Given changing mass distribution → adapt motor commands

**This occurs without symbolic mathematics.**

#### Adaptive Learning Mechanisms

1. **Error-Based Learning**
   - Cerebellar forward models predict sensory consequences
   - Prediction errors drive synaptic weight updates
   - Remarkably similar to gradient descent in ML

2. **Use-Dependent Plasticity**
   - Repeated activation strengthens neural pathways
   - Hebbian learning: "Fire together, wire together"
   - Occurs at spinal level (spinal learning)

3. **Structural Adaptation**
   - Muscles adapt fiber type composition
   - Tendons remodel based on loading patterns
   - Bone density responds to mechanical stress (Wolff's Law)

---

## 2. The Inner Ear and Vestibular System

### 2.1 Architecture of Balance

The vestibular system is the body's inertial measurement unit (IMU), providing continuous real-time data about head position and movement.

#### Semi-Circular Canals (SCCs)

**Structure:**
- Three orthogonal canals (anterior, posterior, horizontal)
- Each canal has an ampulla containing the crista ampullaris
- Hair cells embedded in gelatinous cupula
- Canal filled with endolymph fluid

**Function:**
- Detect angular acceleration (rotation)
- Each canal responds maximally to rotation in its plane
- When head rotates, endolymph lags behind, deflecting cupula
- Hair cell bending → neural firing rate changes

**Encoding:**
- Angular velocity (not acceleration directly)
- Frequency range: 0.1-5 Hz (matches natural head movements)
- Threshold: ~1°/s (extremely sensitive)
- Adaptation to constant velocity within 30 seconds

#### Otolith Organs

**Utricle:**
- Detects horizontal linear acceleration and head tilt
- Hair cells arranged in striola (curved central region)
- Sensitivity to all directions in horizontal plane

**Saccule:**
- Detects vertical linear acceleration
- Important for detecting gravity vector
- Also responds to sound (especially low frequency)

**Mechanism:**
- Otoconia (calcium carbonate crystals) sit on gelatinous matrix
- Hair cell stereocilia embedded in matrix
- Linear acceleration displaces otoconia → hair cell bending
- Hair cells polarized—depolarize in one direction, hyperpolarize in opposite

**The Ambiguity Problem:**
- Otoliths cannot distinguish between:
  - Head tilt relative to gravity
  - Linear acceleration in the horizontal plane
- Brain resolves this using context and multi-sensory integration

### 2.2 How Stability "Feels" Without Being Conceptualized

#### The Vestibular Sense Is:
- **Continuous:** Operates 24/7, even during sleep
- **Preconscious:** We don't "feel" vestibular input directly
- **Integrated:** Always combined with vision and proprioception
- **Qualitative:** We feel "stable" or "unstable," not position values

#### What Stability Feels Like:

**During Stable Stance:**
- No conscious vestibular perception
- Background sense of "being grounded"
- Effortless maintenance of posture
- Body automatically adjusts to perturbations

**During Instability:**
- Vague sense of unease or disorientation
- Increased visual reliance
- Heightened alertness
- Sometimes nausea (vestibular-visual conflict)

**When Lost:**
- Vertigo: False sense of spinning
- Disequilibrium: Feeling "not quite right"
- Ataxia: Clumsy, uncoordinated movement

### 2.3 Vestibular Learning and Adaptation

#### Vestibular Compensation
After vestibular damage, the brain recalibrates:
1. **Acute phase:** Severe symptoms, reliance on other senses
2. **Static compensation:** New baseline established over days
3. **Dynamic compensation:** Movement-specific recalibration over weeks
4. **Complete recovery often possible** despite permanent peripheral damage

#### Adaptation Mechanisms:
- **Substitution:** Visual and proprioceptive inputs replace vestibular
- **Sensory reweighting:** Changed reliance on different sensory modalities
- **Motor learning:** New movement strategies compensate for deficits
- **Cerebellar plasticity:** Forward model recalibration

---

## 3. Intuitive Physics in Biological Systems

### 3.1 Learning Inertia Laws Without Physics Class

#### Core Observation
Animals and children demonstrate sophisticated understanding of physical principles long before formal education. This "intuitive physics" is learned through embodied interaction.

#### Studies in Intuitive Physics

**Infants (4-6 months):**
- Expect objects to follow continuous paths (Baillargeon, 1987)
- Surprised by "impossible" events (objects passing through each other)
- Understand support relations (objects need surface beneath them)
- Expect objects to fall when released

**Toddlers:**
- Understand object permanence
- Navigate around obstacles efficiently
- Predict where rolling balls will go
- Adjust reaching based on object weight

**Animals:**
- Dogs predict trajectory of thrown objects
- Cats calculate jumps based on distance and height
- Squirrels assess branch flexibility before leaping
- Crows understand displacement and volume

### 3.2 Predictive Models Without Formal Mathematics

#### The Embodied Prediction Hypothesis
The brain builds predictive models through:
1. **Motor babbling:** Random movements generate sensory data
2. **Contingency detection:** Correlations between actions and outcomes
3. **Forward model construction:** Neural circuits learn to predict
4. **Error correction:** Prediction errors refine models

**No symbols. No equations. Just trained neural weights.**

#### Key Brain Regions

**Cerebellum:**
- Contains ~80% of brain's neurons
- Builds forward models (predicting sensory consequences)
- Learns to predict even during passive observation
- Essential for smooth, accurate movements

**Parietal Cortex:**
- Integrates multi-sensory information
- Represents space in body-centered coordinates
- "Where" and "how" pathways
- Damage causes neglect and apraxia

**Basal Ganglia:**
- Reinforcement learning
- Action selection
- Habit formation
- Connects prediction to motivation

### 3.3 Pattern Recognition in Waves, Balance, Motion

#### Natural Frequency Detection
Animals detect and exploit natural frequencies:
- Running at leg pendulum frequency (minimizes energy)
- Adjusting stride to terrain stiffness
- Synchronizing with waves (seabirds, dolphins)
- Matching wing beat to air density

#### Balance as Dynamic Equilibrium
Balance is not static but dynamic:
- Constant micro-adjustments
- Postural sway (even when "standing still")
- Phase-locking to moving platforms (boats, trains)
- Transfer of stability strategies between contexts

#### Wave Pattern Learning
- Surfers predict wave breaking points
- Birds ride thermals efficiently
- Fish school in vortex streets
- Humans learn to "read" water patterns

---

## 4. Memory in Muscle and Structure

### 4.1 "Muscle Memory" as Distributed Storage

#### Reframing Muscle Memory
The term "muscle memory" is somewhat misleading—muscles don't store memories. However, the **motor system** stores procedural memories in distributed fashion:

**Cortical Level:**
- Primary motor cortex (M1): Movement execution
- Premotor cortex: Movement planning
- Supplementary motor area: Sequential movements

**Subcortical Level:**
- Cerebellum: Fine-tuning, timing, error correction
- Basal ganglia: Action selection, habit storage
- Thalamus: Motor relay and integration

**Spinal Level:**
- Spinal cord: Reflex circuits, CPGs
- Motor neurons: Final common pathway
- Propriospinal neurons: Inter-segmental coordination

**Muscle Level:**
- Motor units: Store activation patterns
- Myonuclear domains: Local transcription control
- Connective tissue: Mechanical properties shaped by use

#### Evidence for Distributed Storage

**Spinal Learning Experiments:**
- Cats with severed spinal cords learn to walk on treadmills
- Humans with complete spinal injury show motor learning
- Indicates spinal cord can store and modify motor patterns

**Long-Term Muscle Changes:**
- Fiber type conversion (slow ↔ fast twitch)
- Myonuclear addition with training
- Changes in pennation angle
- Tendon stiffness adaptation

### 4.2 Spinal Cord Learning: Central Pattern Generators

#### CPG Architecture

**Half-Center Model:**
- Two populations of interneurons
- Mutually inhibitory connections
- Alternating activation produces rhythmic output
- Tonic input → rhythmic output

**Layered CPG Model:**
- Rhythm generation layer (pacemaker neurons)
- Pattern formation layer (interneuron networks)
- Motor output layer (motor neuron pools)

#### Plasticity in CPGs

**Activity-Dependent Modification:**
- Sensory feedback reshapes CPG output
- Phase resetting by proprioceptive input
- Load compensation through afferent modulation

**Learning Studies:**
- Spinalized animals learn new gait patterns
- Human infants: Stepping reflex can be modified
- Habituation and sensitization at spinal level

### 4.3 The Role of Fascia in Distributed Sensing

#### Fascia: The Missing System

Long overlooked, fascia is now recognized as:
- A continuous connective tissue network throughout the body
- A sensory organ with ~6x more proprioceptors than muscle
- A mechanical force transmitter
- A role in movement coordination

#### Fascial Properties

**Mechanical:**
- Viscoelastic (stores and releases energy)
- Thixotropic (becomes more fluid with movement)
- Pre-stressed (maintains baseline tension)
- Force transmission between non-adjacent muscles

**Sensory:**
- Contains Ruffini, Pacini, and interstitial receptors
- Detects stretch, pressure, and shear
- Provides whole-body tension mapping
- Contributes to proprioception

**Communicative:**
- Mechanical coupling between distant body parts
- "Tensegrity" structures transmit forces globally
- May enable distributed mechanical computation

#### Implications for Learning

- Repeated movement patterns reshape fascial architecture
- "Body memory" may be stored partially in fascial tension patterns
- Manual therapy (massage, Rolfing) affects movement coordination
- Fascial health affects proprioceptive acuity

---

## 5. Reinforcement Without Concepts

### 5.1 Dopamine Signals for Successful Stability

#### The Reward Prediction Error Hypothesis

Dopamine neurons fire in response to:
1. **Unexpected rewards:** Increase firing
2. **Expected rewards:** No change
3. **Expected rewards omitted:** Decrease firing

This is formally equivalent to temporal difference learning:

$$\delta = r + \gamma V(s') - V(s)$$

Where:
- δ = prediction error (dopamine signal)
- r = received reward
- V(s) = expected value of current state
- V(s') = expected value of next state
- γ = discount factor

#### Stability as Reward

The brain rewards stable states:
- Maintaining balance: Mild satisfaction
- Regaining balance: Relief (negative prediction error)
- Falling: Alarm and learning signal
- Successful prediction: Sense of competence

**Dopaminergic pathways:**
- Ventral tegmental area (VTA) → Nucleus accumbens: Reward
- Substantia nigra → Striatum: Movement reinforcement
- Both involved in motor learning

### 5.2 Error-Driven Learning Without Explicit Error Computation

#### Implicit Error Signals

The nervous system computes errors continuously but implicitly:

**Sensory Prediction Errors:**
- Expected vs. actual sensory feedback
- Computed in cerebellum
- Drives motor adaptation

**Motor Errors:**
- Intended vs. actual movement
- Detected through sensory consequences
- Corrections can be automatic (reflexive) or deliberate

**Performance Errors:**
- Task success/failure
- Evaluated against goals
- Signals reinforcement learning

#### Computational Models

**Rescorla-Wagner Model:**
- Classical conditioning
- Prediction error drives learning
- Successfully captures many behavioral phenomena

**Forward-Forward Algorithm (Hinton, 2022):**
- Neural networks learn to predict next states
- Similar to sensory prediction in cerebellum
- No explicit backpropagation through time

**Predictive Coding:**
- Brain as prediction machine
- Errors propagated up hierarchy
- Predictions propagated down
- Minimizing prediction error = learning

### 5.3 Self-Assembly of Stable Configurations

#### Attractor Dynamics

The motor system self-organizes into stable configurations:

**Fixed Point Attractors:**
- Stable postures
- Return to equilibrium after perturbation
- Represented as valleys in state space

**Limit Cycle Attractors:**
- Stable rhythmic movements (walking, running)
- Circular trajectories in state space
- Robust to perturbations

**Chaotic Attractors:**
- Complex movement patterns
- Sensitive to initial conditions
- May underlie flexible, adaptable behavior

#### Self-Organization Principles

1. **Energy Minimization:** Movements tend toward efficient solutions
2. **Constraint Satisfaction:** Multiple constraints shape behavior
3. **Synergy Formation:** Degrees of freedom coupled into functional units
4. **Criticality:** System poised at edge of chaos for flexibility

#### Examples of Self-Assembly

**Bimanual Coordination:**
- Hands naturally fall into in-phase or anti-phase patterns
- Transition between patterns at critical speeds
- Haken-Kelso-Bunz model captures dynamics

**Postural Modes:**
- Standing: Ankle strategy vs. hip strategy
- Switching between modes based on perturbation size
- Self-organized, not explicitly programmed

---

## 6. Implications for Ghost Tiles

### 6.1 Encoding "Intuitive" Patterns

#### Lessons from Biology

**1. Continuous Sensing Over Discrete States**
- Biological systems don't "check" balance—they continuously feel it
- Ghost Tiles should maintain continuous state awareness
- Consider: Analog vs. digital state representation

**2. Local Processing with Global Coherence**
- Each muscle spindle processes locally
- Global coordination emerges from local interactions
- Ghost Tiles: Each tile has local rules, global patterns emerge

**3. Prediction Over Reaction**
- Cerebellum predicts, doesn't just react
- Forward models enable anticipatory adjustments
- Ghost Tiles should predict neighbor states, not just respond

**4. Multiple Timescales**
- Stretch reflex: 25ms
- Long-loop reflex: 100ms
- Voluntary: 200-500ms
- Structural adaptation: Days to months
- Ghost Tiles: Multiple update frequencies for different processes

### 6.2 Distributed vs. Centralized Tile Logic

#### Centralized Architecture (Current Paradigm)
```
        [Central Controller]
              ↓↑
    [Tile] [Tile] [Tile] [Tile]
```
- All logic in central controller
- Tiles are passive sensors/actuators
- Single point of failure
- Scaling requires more central computation

#### Distributed Architecture (Biological Paradigm)
```
[Tile]←→[Tile]←→[Tile]←→[Tile]
  ↑↓     ↑↓     ↑↓     ↑↓
  ←→     ←→     ←→     ←→
```
- Each tile has local computation
- Neighbor-to-neighbor communication
- No single point of failure
- Scaling adds computation linearly

#### Hybrid Architecture Proposal

**Layer 1: Local Reflex (Tile-Level)**
- Each tile maintains local stability
- Responds to immediate neighbor states
- Fast timescale (milliseconds)
- Analogous to stretch reflex

**Layer 2: Regional Coordination (Cluster-Level)**
- Tiles grouped into functional clusters
- Coordinate within cluster for common goals
- Medium timescale (tens of milliseconds)
- Analogous to spinal pattern generators

**Layer 3: Global Integration (Field-Level)**
- Field-wide state monitoring
- Long-term learning and adaptation
- Slow timescale (seconds to hours)
- Analogous to cortical planning

### 6.3 Learning Stability Conditions Without Symbolic Computation

#### Proposal: Gradient-Based Tile Behavior

Instead of explicit rules ("if neighbor X, then do Y"), tiles could learn gradient behaviors:

**Energy Landscape Model:**
- Define energy function over tile states
- Tiles move to minimize local energy
- Global minima = stable configurations
- No symbolic rules needed

**Mathematical Formulation:**
```
E(state) = Σ local_stability(i) + Σ neighbor_coupling(i,j)

Tile i updates: state_i ← state_i - η ∂E/∂state_i
```

This is equivalent to:
- Gradient descent in physics
- Self-organizing systems
- Attractor dynamics in neural networks

#### Learning Mechanisms for Tiles

**1. Hebbian-Like Learning:**
```
When tile i and neighbor j both stable: strengthen coupling
When tile i and neighbor j unstable together: weaken coupling
```

**2. Prediction Error Learning:**
```
Tile predicts neighbor state based on own state
Compare prediction to actual state
Adjust internal weights to minimize error
```

**3. Reward-Based Learning:**
```
Field provides global stability signal
Tiles reinforce behaviors that improve stability
Stable configurations become attractors
```

### 6.4 Novel Architecture Proposals

#### Proposal A: Vestibular Tile System

**Concept:** Designate "vestibular tiles" as reference frames for field stability.

**Implementation:**
- Vestibular tiles sense global field orientation
- Non-vestibular tiles reference vestibular tiles
- Vestibular tiles can be repositioned (like head orientation)
- Field maintains coherent reference frame

**Analogy:** Tiles = body parts, Vestibular tiles = inner ear

#### Proposal B: Fascial Communication Network

**Concept:** Implement a "fascial layer" that provides distributed tension sensing.

**Implementation:**
- Create virtual springs between all tiles (not just neighbors)
- Spring tensions encode field-wide state
- Tension distribution influences tile behavior
- Enables non-local coordination

**Analogy:** Fascial layer = body fascia network

#### Proposal C: CPG-Inspired Oscillator Tiles

**Concept:** Tiles as coupled oscillators with stable rhythmic patterns.

**Implementation:**
- Each tile has internal oscillator state (phase, amplitude)
- Neighbors couple their oscillators
- Stable patterns are limit cycle attractors
- Patterns persist without external drive

**Analogy:** Oscillator tiles = central pattern generators

#### Proposal D: Proprioceptive Field Memory

**Concept:** Store stability patterns in field configuration, not external memory.

**Implementation:**
- Past stable configurations shape present tile states
- Each tile maintains short history of own states
- History influences current behavior
- Patterns can be "recalled" by partial cues

**Analogy:** Field memory = muscle memory

---

## 7. Synthesis and Key Insights

### 7.1 Core Principles from Biological Learning

| Principle | Biological Example | Tile System Application |
|-----------|-------------------|------------------------|
| Continuous sensing | Proprioception never "off" | Tiles always aware of state |
| Local processing | Muscle spindle response | Tile-level computation |
| Prediction over reaction | Cerebellar forward models | Predictive tile behavior |
| Multiple timescales | Reflex → voluntary → adaptation | Fast/medium/slow tile updates |
| Distributed storage | Motor memory across system | Stability patterns in tile states |
| Self-organization | Attractor dynamics | Emergent stable configurations |
| Reward-based shaping | Dopamine signals | Global stability reinforcement |
| Tension-based sensing | Fascial network | Field-wide tension mapping |

### 7.2 Key Differentiator: Embodiment

Biological systems learn stability through **embodied interaction**:
- The body is both sensor and actuator
- Learning is inseparable from physical structure
- Knowledge is enacted, not represented

For Ghost Tiles:
- Tiles should "embody" stability-seeking behavior
- Physical arrangement shapes computation
- No separation between "knowing" and "doing"

### 7.3 Non-Cognitive = Non-Symbolic

Biological stability systems operate without:
- Symbols representing "balance"
- Explicit rule storage
- Centralized computation
- Conceptual understanding

They succeed through:
- Learned sensorimotor contingencies
- Distributed neural weights
- Self-organizing attractors
- Embodied prediction

Ghost Tiles can achieve similar "understanding" through equivalent mechanisms.

---

## 8. Research Questions for Future Exploration

1. **Local vs. Global Learning:** Can tiles learn purely from neighbor interactions, or is field-level feedback necessary?

2. **Retention Without Memory:** How can stability patterns persist in tile states without explicit memory storage?

3. **Transfer Learning:** Can stability patterns learned in one tile configuration transfer to another?

4. **Optimality vs. Robustness:** Biological systems favor robustness. How should tiles balance optimal stability with robust adaptation?

5. **Scale Invariance:** Biological systems work across scales (cells → organs → organisms). Can tile architectures scale similarly?

6. **Damage Compensation:** How can tile fields compensate for damaged or missing tiles, like vestibular compensation?

7. **Evolutionary Development:** Can tile rules evolve through selection pressure rather than explicit design?

---

## 9. Implementation Roadmap

### Phase 1: Proprioceptive Tiles
- Implement local stability sensing
- Neighbor-to-neighbor state communication
- Basic stability-seeking behavior

### Phase 2: Vestibular Integration
- Designate reference tiles
- Implement field-wide orientation sense
- Test reorientation capabilities

### Phase 3: Learning Mechanisms
- Implement prediction error learning
- Add Hebbian coupling updates
- Test stability pattern acquisition

### Phase 4: Multi-Timescale Operation
- Fast local updates
- Medium cluster coordination
- Slow global adaptation

### Phase 5: Self-Organization
- Define energy landscapes
- Test attractor formation
- Measure stability without explicit rules

---

## 10. References and Further Reading

### Primary Sources

**Proprioception:**
- Proske, U., & Gandevia, S. C. (2012). The proprioceptive senses: their roles in signaling body shape, body position and movement.
- Matthews, P. B. C. (1982). Where does Sherrington's "muscular sense" originate?

**Vestibular System:**
- Angelaki, D. E., & Cullen, K. E. (2008). Vestibular system: the many facets of a multimodal sense.
- Baloh, R. W., & Honrubia, V. (2001). Clinical Neurophysiology of the Vestibular System.

**Intuitive Physics:**
- Baillargeon, R. (1987). Object permanence in 3½- and 4½-month-old infants.
- Spelke, E. S., & Kinzler, K. D. (2007). Core knowledge.

**Motor Learning:**
- Wolpert, D. M., & Ghahramani, Z. (2000). Computational principles of movement neuroscience.
- Shadmehr, R., & Krakauer, J. W. (2008). A computational neuroanatomy for motor control.

**Fascia:**
- Schleip, R., et al. (2012). Fascia: The Tensional Network of the Human Body.
- Findley, T. W., & Schleip, R. (2009). Fascia Research II.

**Reinforcement Learning:**
- Schultz, W., Dayan, P., & Montague, P. R. (1997). A neural substrate of prediction and reward.
- Doya, K. (2000). Complementary roles of basal ganglia and cerebellum in learning and motor control.

---

## Appendix A: Glossary of Biological Terms

| Term | Definition |
|------|------------|
| **Proprioception** | Sense of body position and movement |
| **Muscle Spindle** | Stretch receptor in muscle |
| **Golgi Tendon Organ** | Force receptor at muscle-tendon junction |
| **Vestibular System** | Inner ear balance organs |
| **Semi-circular Canal** | Rotation-sensing structure |
| **Otolith** | Linear acceleration-sensing structure |
| **CPG** | Central Pattern Generator - spinal rhythm circuit |
| **Fascia** | Connective tissue network |
| **Forward Model** | Neural circuit predicting sensory consequences |
| **Attractor** | Stable state in dynamical system |
| **Synergy** | Coordinated group of degrees of freedom |
| **Tensegrity** | Tensional integrity structure |

---

## Appendix B: Mathematical Models

### B.1 Stretch Reflex Dynamics

$$\tau \frac{dF}{dt} = -F + k \cdot \Delta L + b \cdot \frac{dL}{dt}$$

Where:
- F = muscle force
- ΔL = length change
- k = stiffness parameter
- b = damping parameter
- τ = time constant

### B.2 CPG Half-Center Model

$$\frac{dx_1}{dt} = -x_1 - \beta \cdot f(x_2) + I$$
$$\frac{dx_2}{dt} = -x_2 - \beta \cdot f(x_1) + I$$

Where:
- x₁, x₂ = activity of two half-centers
- f = activation function
- β = coupling strength
- I = tonic input

### B.3 Reinforcement Learning (TD Error)

$$\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$$
$$V(s_t) \leftarrow V(s_t) + \alpha \delta_t$$

### B.4 Attractor Dynamics

$$\frac{dx}{dt} = -\frac{\partial E}{\partial x} + \eta(t)$$

Where:
- x = state vector
- E = energy/potential function
- η = noise

---

*Document prepared by Agent BIORA*  
*Research Division: Biological Learning Systems*  
*Classification: Open Research*
