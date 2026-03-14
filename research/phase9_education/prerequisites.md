# SuperInstance Curriculum - Prerequisites

## Overview

This document outlines the knowledge requirements for each level of the SuperInstance curriculum. Prerequisites ensure students have the foundation to succeed while maintaining accessibility for diverse backgrounds.

## Diagnostic Assessment

Before starting, all students take a **placement test** covering:
- Programming fundamentals
- Mathematical maturity
- Systems concepts
- Problem-solving ability

**Outcome**: Personalized learning path with recommended preparation

---

## Level 1: Associate Certification Prerequisites

### Absolute Minimum (4 weeks of prep provided)

If you lack any prerequisites, the curriculum includes **preparatory modules** to bridge gaps.

### Required Knowledge

#### Programming Fundamentals
```python
# You should be able to:
1. Write basic functions and classes
2. Understand data structures (lists, dicts, sets)
3. Read and debug simple code
4. Use version control (git)

# Example competency level:
def process_tiles(tiles):
    """Filter and transform tile data."""
    return [t for t in tiles if t.active]
```

#### Mathematical Maturity
```
1. Basic algebra: solve equations, manipulate formulas
2. Geometry: understand 2D/3D space, rotations
3. Probability: basic probability and statistics
4. Logic: boolean operations, conditional reasoning

# Example competency level:
# Given: P(A) = 0.7, P(B) = 0.5, P(A∩B) = 0.3
# Calculate: P(A∪B) = P(A) + P(B) - P(A∩B) = 0.9
```

#### Systems Concepts
```
1. Understand client-server architecture
2. Basic networking concepts (IP, ports, protocols)
3. Data storage (databases, files)
4. APIs and web services
```

### Recommended (But Not Required)

#### Experience With
- Python programming (3.x)
- Basic linear algebra concepts
- Using command line/terminal
- Reading technical documentation

#### Helpful Background
- Computer Science fundamentals
- Data structures and algorithms
- Basic statistics
- Unix/Linux commands

### Preparation Modules (If Needed)

**Module 0.1: Programming Bootcamp** (1 week)
- Python syntax and idioms
- Data structures and algorithms
- Object-oriented programming
- Testing and debugging

**Module 0.2: Mathematics Refresh** (1 week)
- Algebra and functions
- Geometry and trigonometry
- Probability and statistics
- Logic and proofs

**Module 0.3: Systems Overview** (1 week)
- Computer architecture basics
- Networking fundamentals
- Operating systems concepts
- Web technologies

**Module 0.4: Tools Setup** (1 week)
- Development environment setup
- Git and GitHub
- Jupyter notebooks
- Basic Linux commands

### Self-Assessment Quiz

**Can you complete these tasks?**

```python
# Programming
# 1. Write a function to check if a number is prime
def is_prime(n):
    # Your code here
    pass

# 2. Create a class representing a 2D point
class Point:
    def __init__(self, x, y):
        # Your code here
        pass

# 3. Parse JSON data and extract values
import json
data = '{"tiles": [{"id": 1, "active": true}]}'
# Extract the tile ID

# Mathematics
# 4. Solve: 2x + 5 = 13
# Answer: x = 4

# 5. Calculate the distance between points (0,0) and (3,4)
# Answer: 5 (using Pythagorean theorem)

# 6. If P(A) = 0.3 and P(B|A) = 0.5, what is P(A∩B)?
# Answer: 0.15
```

**If yes**: You're ready for Associate level
**If no**: Take preparation modules first

---

## Level 2: Professional Certification Prerequisites

### Required: Associate Certification OR Equivalent Experience

If you don't have Associate certification, you should have:

#### Programming Proficiency
```python
# You should be able to:
1. Design and implement complex systems
2. Write clean, maintainable code
3. Understand design patterns
4. Optimize performance

# Example competency level:
class TileNetwork:
    """Manage distributed tile system."""
    def __init__(self, config):
        self.tiles = {}
        self.edges = {}
        # Initialize from config

    def add_tile(self, tile_id, neighbors):
        """Add tile with network awareness."""
        # Implementation with error handling
        pass

    def optimize_layout(self):
        """Optimize for minimal communication."""
        # Graph algorithm implementation
        pass
```

#### Mathematical Sophistication
```
1. Linear algebra: vectors, matrices, transformations
2. Calculus: derivatives, integrals, optimization
3. Probability: distributions, Bayes' theorem
4. Algorithms: complexity, Big O notation

# Example competency level:
# Given matrix A and vector b, solve Ax = b
# Understand eigenvalues and eigenvectors
# Apply gradient descent for optimization
```

#### Systems Knowledge
```
1. Distributed systems concepts
2. Concurrent programming
3. Database systems
4. Performance optimization
```

### Equivalent Experience

**Instead of Associate certification, you may qualify with:**

- **1+ years** software engineering experience OR
- **Completed** undergraduate CS degree OR
- **Built** distributed system in production OR
- **Published** technical paper or blog post

### Validation Assessment

Before Professional certification, take **placement test** covering:

```python
# Coding challenge (30 minutes)
def implement_value_iteration(states, actions, rewards, gamma):
    """
    Implement value iteration algorithm.

    Args:
        states: list of state identifiers
        actions: list of possible actions
        rewards: dict mapping (state, action) to reward
        gamma: discount factor

    Returns:
        dict mapping state to value
    """
    # Your implementation
    pass

# System design (45 minutes)
# Design a distributed caching system that:
# 1. Handles 10K requests per second
# 2. Maintains consistency across nodes
# 3. Survives node failures
# 4. Scales horizontally

# Mathematical reasoning (30 minutes)
# 1. Compute gradient of f(x,y) = x^2 + 2xy + y^2
# 2. Apply chain rule to composite function
# 3. Solve optimization problem using Lagrange multipliers
```

**Passing Score**: 70% or above
**Below 70%**: Take Associate certification first

---

## Level 3: Expert Certification Prerequisites

### Required: Professional Certification OR Equivalent Research Experience

If you don't have Professional certification, you should have:

#### Research Maturity
```
1. Read and understand academic papers
2. Formulate research questions
3. Design experiments
4. Write technical reports
5. Use LaTeX for mathematical writing
```

#### Advanced Mathematics
```
1. Real analysis and measure theory
2. Functional analysis
3. Differential geometry
4. Information theory
5. Probability theory
```

#### Systems Expertise
```
1. Designed production systems at scale
2. Led technical teams
3. Published research or technical work
4. Presented at conferences or meetups
```

### Equivalent Experience

**Instead of Professional certification, you may qualify with:**

- **MS/PhD** in Computer Science, Mathematics, or related field OR
- **3+ years** experience in ML/AI research OR
- **Published** first-author paper at top venue OR
- **Led** design of production distributed system

### Research Validation

Before Expert certification, submit:

1. **Research Proposal** (2 pages)
   - Clear research question
   - Literature review
   - Proposed methodology
   - Expected contributions

2. **Code Portfolio**
   - GitHub profile with substantial projects
   - Clean, well-documented code
   - Test coverage and CI/CD

3. **Technical Writing Sample**
   - Blog post, paper, or technical documentation
   - Clear explanation of complex concepts
   - Proper mathematical notation

**Review Process**: Expert committee evaluates submission
**Outcome**: Approved, conditional (minor revisions), or not ready

---

## Subject-by-Subject Breakdown

### Mathematics Prerequisites by Level

#### Associate Level (High School +)
```
✅ Arithmetic and Algebra
✅ Geometry (2D/3D)
✅ Basic Probability
✅ Functions and Graphs
✅ Logic and Proofs (introductory)

❌ Calculus (not required)
❌ Linear Algebra (not required)
❌ Differential Equations (not required)
```

#### Professional Level (Undergraduate)
```
✅ All Associate topics
✅ Calculus I & II
✅ Linear Algebra
✅ Probability Theory
✅ Algorithms and Complexity
✅ Discrete Mathematics

❌ Real Analysis (not required)
❌ Measure Theory (not required)
❌ Functional Analysis (not required)
```

#### Expert Level (Graduate)
```
✅ All Professional topics
✅ Real Analysis
✅ Measure Theory
✅ Functional Analysis
✅ Differential Geometry
✅ Information Theory
✅ Advanced Probability
✅ Optimization Theory
```

### Programming Prerequisites by Level

#### Associate Level (Introductory)
```python
✅ Variables and Types
✅ Control Flow (if, loops)
✅ Functions and Modules
✅ Basic Data Structures
✅ File I/O
✅ Error Handling
✅ Git Basics

❌ Object-Oriented Design (not required)
❌ Concurrency (not required)
❌ Performance Optimization (not required)
```

#### Professional Level (Intermediate)
```python
✅ All Associate topics
✅ Object-Oriented Programming
✅ Design Patterns
✅ Concurrency and Parallelism
✅ Performance Profiling
✅ Testing and TDD
✅ API Design
✅ Database Integration

❌ Advanced Concurrency (not required)
❌ GPU Programming (not required)
❌ Distributed Algorithms (not required)
```

#### Expert Level (Advanced)
```python
✅ All Professional topics
✅ Advanced Concurrency
✅ GPU Programming (CUDA, OpenCL)
✅ Distributed Algorithms
✅ Compiler Design
✅ System Optimization
✅ Custom Hardware Acceleration
```

### Systems Prerequisites by Level

#### Associate Level (Basic)
```
✅ Computer Architecture Basics
✅ Operating System Fundamentals
✅ Networking Concepts
✅ Web Technologies (HTTP, REST)
✅ Database Basics

❌ Distributed Systems (not required)
❌ Cloud Computing (not required)
❌ Container Orchestration (not required)
```

#### Professional Level (Intermediate)
```
✅ All Associate topics
✅ Distributed Systems
✅ Cloud Computing (AWS/GCP/Azure)
✅ Container Technologies (Docker, Kubernetes)
✅ Microservices Architecture
✅ Monitoring and Observability

❌ Advanced Distributed Algorithms (not required)
❌ Custom Infrastructure (not required)
```

#### Expert Level (Advanced)
```
✅ All Professional topics
✅ Advanced Distributed Algorithms
✅ Custom Infrastructure Design
✅ High-Performance Computing
✅ Edge Computing
✅ Multi-Cloud Strategies
```

---

## Bridge Courses

### For Mathematicians Wanting Engineering Skills

**Course: Programming for Mathematicians** (4 weeks)
```
Week 1: Python for scientific computing
Week 2: Data structures and algorithms
Week 3: Software engineering practices
Week 4: Version control and collaboration
```

### For Engineers Wanting Mathematics Background

**Course: Mathematics for Engineers** (4 weeks)
```
Week 1: Linear algebra refresher
Week 2: Calculus and optimization
Week 3: Probability and statistics
Week 4: Proof techniques and mathematical reasoning
```

### For Non-Technical Professionals

**Course: Technical Fundamentals for Business** (4 weeks)
```
Week 1: Systems thinking and architecture
Week 2: Data and algorithms
Week 3: Development lifecycle
Week 4: Technical communication
```

---

## Prerequisite Waivers

### Waiver Policy

Students may waive prerequisites if they can demonstrate equivalent knowledge through:

1. **Coursework**: Transcript showing relevant courses with B+ or better
2. **Experience**: Resume showing relevant work experience
3. **Projects**: Portfolio demonstrating required skills
4. **Certifications**: Industry certifications (e.g., AWS, GCP)
5. **Assessment**: Pass waiver exam with 80% or higher

### Waiver Process

1. Submit waiver application with evidence
2. Pay waiver exam fee ($50)
3. Complete online proctored exam (2 hours)
4. Receive decision within 5 business days

### Waiver Exam Samples

**Associate Waiver Exam**
```python
# Programming section (45 minutes)
# 1. Implement a function to find the median of a list
# 2. Create a class with proper encapsulation
# 3. Debug a provided code snippet

# Mathematics section (45 minutes)
# 1. Solve algebraic equations
# 2. Calculate geometric quantities
# 3. Apply probability rules

# Systems section (30 minutes)
# 1. Explain client-server architecture
# 2. Identify network protocols
# 3. Design simple database schema
```

**Professional Waiver Exam**
```python
# Programming section (60 minutes)
# 1. Design and implement caching system
# 2. Optimize given algorithm for performance
# 3. Write tests for complex function

# Mathematics section (60 minutes)
# 1. Compute eigenvalues and eigenvectors
# 2. Apply gradient descent
# 3. Solve optimization problem

# Systems section (60 minutes)
# 1. Design distributed architecture
# 2. Identify scalability bottlenecks
# 3. Plan disaster recovery strategy
```

---

## Recommended Preparation Path

### For Complete Beginners (No Programming Experience)

**Timeline**: 12 weeks before starting Associate certification

```
Month 1: Programming Fundamentals
├── Python syntax and basic programs
├── Data structures and algorithms
└── Practice problems (LeetCode easy)

Month 2: Mathematics Refresh
├── Algebra and functions
├── Geometry and trigonometry
├── Probability basics
└── Practice problems (Khan Academy)

Month 3: Systems Overview
├── Computer basics and networking
├── Web technologies
├── Databases and APIs
└── Build small project
```

### For Career Changers (Some Programming Experience)

**Timeline**: 8 weeks before starting Professional certification

```
Weeks 1-2: Deepen Programming Skills
├── Object-oriented design
├── Design patterns
└── Build medium project

Weeks 3-4: Mathematics for Engineers
├── Linear algebra
├── Calculus basics
└── Probability and statistics

Weeks 5-6: Systems at Scale
├── Distributed systems concepts
├── Cloud platforms
└── Container technologies

Weeks 7-8: Preparation Project
├── Design system architecture
├── Implement core features
└── Deploy to cloud
```

### For Researchers (Strong Math, Less Programming)

**Timeline**: 4 weeks before starting Expert certification

```
Week 1: Software Engineering
├── Best practices and patterns
├── Testing and documentation
└── Code review skills

Week 2: Systems for Research
├── Research computing infrastructure
├── GPU programming basics
└── Large-scale data processing

Weeks 3-4: Research Project
├── Implement paper from literature
├── Run experiments
└── Write technical report
```

---

## Self-Study Resources

### Free Resources

**Programming**
- [Python.org Tutorial](https://docs.python.org/3/tutorial/)
- [LeetCode](https://leetcode.com/) for practice
- [GitHub Learning Lab](https://lab.github.com/)

**Mathematics**
- [Khan Academy](https://www.khanacademy.org/)
- [3Blue1Brown](https://www.3blue1brown.com/) for intuition
- [MIT OpenCourseWare](https://ocw.mit.edu/)

**Systems**
- [AWS Training](https://aws.amazon.com/training/)
- [Google Cloud Skills Boost](https://www.cloudskillsboost.google/)
- [Microsoft Learn](https://docs.microsoft.com/learn/)

### Paid Resources (Optional)

**Programming**
- [Udemy](https://www.udemy.com/) Python courses
- [Coursera](https://www.coursera.org/) Computer Science courses
- [edX](https://www.edx.org/) MicroMasters programs

**Mathematics**
- [Brilliant.org](https://brilliant.org/) for interactive learning
- [The Great Courses](https://www.thegreatcourses.com/) mathematics series
- [Wolfram Alpha](https://www.wolframalpha.com/) for problem solving

**Systems**
- [A Cloud Guru](https://acloudguru.com/) cloud certification prep
- [Linux Foundation](https://www.linuxfoundation.org/) training
- [Pluralsight](https://www.pluralsight.com/) technology skills

---

**Document Version**: 1.0.0
**Last Updated**: 2026-03-13
**Next Review**: 2026-09-13
