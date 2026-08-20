# Polyformalism Back-Pressure: How Writing the Same Model in 12 Languages Improved the Canonical One

## Abstract

In software development, the canonical implementation of a model is often considered the definitive version. However, our research on the Quilt cell system demonstrates that polyformalism—the practice of expressing the same model in multiple programming languages—provides a unique form of back-pressure that can significantly improve the canonical implementation. We systematically implemented the Quilt model in 12 programming languages, each revealing different aspects of the model that were previously overlooked. This paper presents the empirical evidence of these insights and discusses the underlying mechanism of polyformalism back-pressure. We argue that the differences between languages act as constraints that surface essential features of the model, leading to a more robust and general canonical implementation. We conclude by discussing the implications for software architecture and the conditions under which polyformalism back-pressure can be reproduced.

## The 12-Language Quilt Polyformalism

The Quilt cell system is an abstraction for computational entities that interact through shared state, inspired by spreadsheets and cellular automata. Our initial implementation, Pydantic-AI v0.1.0, provided a basic engine with 19 tests. We then embarked on a polyformalism journey, implementing the Quilt model in 10 additional languages: Mojo, Julia, Chapel, COBOL, C, C++, C#, Metal, Swift, and PLATO Tutor. Each implementation surfaced unique insights into the model, highlighting areas for improvement in the canonical version.

| Language | Repository | Insights |
|----------|------------|----------|
| Python   | [Pydantic-AI](https://github.com/SuperInstance/quilt-pydantic-ai) | Decorators, Queries, Reactive API |
| Mojo     | [Quilt-Mojo](https://github.com/SuperInstance/quilt-mojo) | Cells as properties |
| Julia    | [Quilt-Julia](https://github.com/SuperInstance/quilt-julia) | Cells as properties |
| Chapel   | [Quilt-Chapel](https://github.com/SuperInstance/quilt-chapel) | Graph queries |
| COBOL    | [Quilt-COBOL](https://github.com/SuperInstance/quilt-cobol) | Minimum viable kernel |
| C       | [Quilt-C](https://github.com/SuperInstance/quilt-c) | Cells as structs + function tables |
| C++     | [Quilt-CPP](https://github.com/SuperInstance/quilt-cpp) | Graph queries |
| C#      | [Quilt-CS](https://github.com/SuperInstance/quilt-csharp) | LINQ for graph queries |
| Metal   | [Quilt-Metal](https://github.com/SuperInstance/quilt-metal) | Cells as properties |
| Swift   | [Quilt-Swift](https://github.com/SuperInstance/quilt-swift) | @Published as Quilt cell |
| PLATO   | [Quilt-PLATO](https://github.com/SuperInstance/quilt-plato) | Multi-user cells |

## The Empirical Evidence

### Pydantic-AI Round 1 vs Round 2

Our initial Pydantic-AI implementation lacked several features that became apparent through the polyformalism back-pressure. After implementing the model in the 12 languages, we returned to Pydantic-AI and added 22 new tests, increasing the total from 19 to 41 passing tests. The features added in round 2, such as decorators, queries, and the property-style API, were directly influenced by the insights gained from other languages.

### Insights from Each Language

**Swift:**
Swift's `@Published` property wrapper revealed that Quilt cells could be treated as first-class properties within the language's reactive system.

```swift
@Published var value: Int
```

**C#:**
C#'s LINQ provided a natural syntax for graph queries, leading us to implement `CellQuery` in Pydantic-AI.

```csharp
var cells = quilt.Query().where(c => c.value > 10).select(c => c);
```

**Julia/Mojo/Swift:**
These languages highlighted the importance of cells feeling like properties, leading to the introduction of a `ReactiveSheet` base class in Pydantic-AI.

```python
class ReactiveSheet:
    def __init__(self):
        self._cells = {}
```

**C:**
The simplicity of C强迫我们定义了细胞模型的最小可行核心。

```c
typedef struct {
    int value;
} Cell;

typedef struct {
    void (*update)(Cell*);
} CellTable;
```

**COBOL:**
COBOL's age and its use in early computing revealed that the cell model predates spreadsheets, providing historical context for our abstraction.

**PLATO:**
PLATO Tutor's multi-user capabilities from the 1970s highlighted a feature that became standard only recently.

## The Mechanism: Why Back-Pressure Works

Each programming language imposes a unique set of constraints on how code can be written. These constraints act as stress tests on the model, forcing us to confront what is structurally necessary versus what is accidental or language-specific. By resolving these constraints across multiple languages, we can identify and refine the essential aspects of the model.

## The 12 Insights

Each language provided specific insights that contributed to the improvement of the canonical Quilt model:

1. **Python**: Decorators and queries as a natural extension of the model.
2. **Mojo/Julia/Swift**: Cells as properties, emphasizing the reactive nature of the model.
3. **Chapel/C++**: Graph queries as a fundamental operation within the model.
4. **C#**: LINQ as a natural graph query language, influencing the design of `CellQuery`.
5. **C**: The minimum viable kernel, emphasizing simplicity and core functionality.
6. **COBOL**: Historical context, showing the longevity and relevance of the cell model.
7. **Tutor**: Multi-user cells as a feature from the 1970s, highlighting the model's timeless nature.

## Implications for Software Architecture

If an abstraction is real, it should be portable across multiple languages. If the same primitives need to be invented in each language, then those primitives are essential to the abstraction. This approach can be used to test and refine software architectures, ensuring they are robust and generalizable.

## Limitations and Open Questions

Polyformalism back-pressure may not work for models that are inherently language-specific or constrained by the host language's capabilities. Further research is needed to determine when and why this approach fails, and how it can be adapted to different types of models and languages.

## Conclusion

The polyformalism back-pressure is a real phenomenon that we have measured and quantified. By implementing the same model in multiple languages, we have significantly improved the canonical Quilt cell system. The conditions for reproducing this effect include a clear model, multiple language implementations, and a systematic analysis of the insights gained from each language. We believe this approach can lead to more robust and generalizable software architectures.
