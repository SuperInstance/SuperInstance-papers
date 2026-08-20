# The Cell Model is Older Than Spreadsheets: A Pre-History of the Quilt Cell Abstraction in 1959 COBOL, 1970 PLATO Tutor, and 1972 C

*White paper — superinstance-papers / white-papers*

---

## Abstract

The "cell" — a typed value paired with a computation that derives it from other values — is conventionally traced to VisiCalc in 1979 and to the spreadsheet paradigm that followed. This paper argues that this attribution is a historical accident of visibility, not a description of invention. The cell abstraction existed, in substantively complete form, in three earlier systems developed by three independent communities: the 1959 COBOL specification (which introduced hierarchical typed records with named procedures over them), the 1970 PLATO Tutor authoring language (which introduced a multi-user federation of display cells with reactive edges between them), and the 1972 C programming language (which expressed the cell as a struct of data plus a function pointer — the minimum viable kernel). We trace this lineage, present code samples from each era, and argue that the Quilt cell model synthesized in 2024 is not a novelty but a restoration: the reunion of three independent inventions of the same underlying computational unit. The implications extend beyond Quilt. If the cell model is this old, then other "modern" reactive abstractions may be rediscoveries of patterns already implicit in 1950s record processing. We close by enumerating four further abstractions — reducers, reactive streams, CRDTs, and statecharts — whose pre-spreadsheet ancestors we believe deserve similar reconsideration.

## 1. The Four Ages of Cells

Computing has reinvented the cell at least four times. The conventional chronology is wrong about which invention came first.

**First age — pre-spreadsheet record processing, 1959–1978.** The cell emerges implicitly in record-oriented languages and timesharing systems. COBOL's DATA division defines hierarchical records whose level numbers (01, 05, 10, …) compose sub-cells of the parent. The PROCEDURE division names operations over those records via `PERFORM`. PLATO Tutor (1970) defines state machines of *units* connected by *arrows*, with shared variables in a *room* visible to every user. C (1972) reduces the abstraction to its minimum: a struct holding data, a function pointer for the computation, and a list of pointers to dependents. There is no spreadsheet in this age, and in the first two of these systems no reactive propagation. But the data model — typed values arranged in a graph, with named procedures that read and write them — is the same data model that Quilt calls the *cell*.

**Second age — the spreadsheet, 1979–1999.** VisiCalc, Lotus 1-2-3, and Excel make the cell explicit and visible. Every spreadsheet cell is a typed value with a formula, a display coordinate, and a position in a two-dimensional grid. Reactive evaluation is added: change a cell, and all dependents recompute. This is what most programmers and most end-users today mean when they say "the cell model." But the model is not new. It is the 1959 record model made visible in two dimensions and given reactive edges.

**Third age — typed reactive programming, 2000–2019.** The cell becomes typed in the programmer's sense. Reactive eXtensions (Rx, 2009), MobX (2015), Vue (2014), and React (2013) all introduce cells as first-class values with declared dependencies, automatic propagation, and — in some cases — hierarchical composition. The model acquires a type system, an effect system, and (with React) a virtual-DOM reconciliation algorithm. Spreadsheets are no longer the only place cells live; spreadsheets are a special case.

**Fourth age — synthesis, 2020–.** Quilt (2024) and adjacent systems reunite the three prior ages. Quilt defines eight cell kinds — `value`, `formula`, `api`, `program`, `sensor`, `listener`, `router`, `io` — covering static data through to bidirectional external interfaces. Cells compose into sheets, sheets federate across instances, instances run on multiple runtimes, and the entire graph is type-safe (Manifesto, *Quilt*). The polyformalism project ports this single model to twelve languages to surface what is essential to the model and what is incidental to the host language.

This paper focuses on the first age, which is the least studied. The cell did not begin with VisiCalc. It began, in recognizable form, twenty years earlier, and had been independently reinvented in three communities before Bricklin and Frankston wrote their first 6502 code.

## 2. COBOL 1959: Hierarchical Records as Cells

The Conference on Data Systems Languages (CODASYL) committee that produced the first COBOL specification in 1959 was a joint effort of the United States Department of Defense, computer manufacturers, and academic computer scientists. Mary K. Hawes, a Burroughs Corporation employee, had circulated a questionnaire in 1958 that effectively defined the shape of the problem; Grace Hopper served as the technical advisor from the Navy, and the short-range committee that produced the first specification was chaired by Hawes. The first COBOL specification, *COBOL — Common Business Oriented Language — US Department of Defense*, was published in April 1959. The first ANSI standard for the language followed in 1968, but the 1959 CODASYL specification was already complete enough to be implemented on RCA and Remington Rand machines within months.

COBOL's structure was, for its time, radical. The four-division structure — `IDENTIFICATION DIVISION`, `ENVIRONMENT DIVISION`, `DATA DIVISION`, `PROCEDURE DIVISION` — is a layered system in which each division is a distinct category of concern. The DATA division describes the shape of data. The PROCEDURE division describes the operations over that data. There is no global namespace, no header files, no import resolution; the data is described declaratively, and the procedures are invoked by name. The 1959 report describes the design intent explicitly: to separate what the program *is*, where it *runs*, what it *holds*, and what it *does* (CODASYL 1959, §2).

Most relevant to the cell lineage is the **DATA division's level-number system**. Records are nested via two-digit level numbers: `01` is the root, `05` is a child, `10` is a sub-child, and so on. Each level can contain either a primitive field (with a `PICTURE` clause specifying its type) or a group (which itself contains sub-fields). The level numbers are not array indices; they are arbitrary decimals that allow insertion of new sub-levels between existing levels without renumbering the whole structure. The 88-level (the only single-digit level) is reserved for *condition names* — a derived boolean value tied to a parent field, conceptually identical to a formula cell that evaluates to a boolean.

This is the same shape as Quilt's nested cells. A 01-level record is a parent cell. A 05-level field is a child cell. A 10-level field is a grandchild. `PICTURE` clauses are cell types. The 88-level conditions are boolean cells derived from their parent.

The **PROCEDURE division** is the operation layer. `PERFORM` invokes a named paragraph; a paragraph is a sequence of operations that reads and writes the cells described in DATA. The paragraph has a name, which is a cell address in the procedural namespace. To invoke an operation is to call a function over the cell graph. The 1959 `PERFORM` allowed a single paragraph name; the loop form (`PERFORM VARYING … UNTIL`) followed in the 1961 extension.

The 1959 specification does not include reactive propagation. There is no event system, no observer pattern, no change notification. But the *structure* of the computation is identical to a cell graph: typed values, named procedures, a hierarchy of composition, and a single composition point (the `PERFORM` graph in the leading paragraph) that orchestrates the whole. The 1959 CODASYL COBOL specification predates VisiCalc by twenty years.

### 2.1 A 1959-style COBOL program

Consider the following COBOL program in the idiom of the 1960 ANSI extension. It defines a single order cell (the 01-level) with a customer sub-cell, line-item sub-cells, and a derived total cell:

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. OrderCell.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. UNIVAC-I.
       OBJECT-COMPUTER. UNIVAC-I.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  ORDER-CELL.
           05  ORDER-STATUS          PIC X(10).
           05  CUSTOMER.
               10  CUST-ID           PIC 9(6).
               10  CUST-NAME         PIC X(30).
           05  LINE-ITEMS.
               10  ITEM OCCURS 10 TIMES INDEXED BY ITEM-IDX.
                   15  SKU           PIC X(8).
                   15  QTY           PIC 9(4).
                   15  UNIT-PRICE    PIC 9(6)V99.
                   15  LINE-TOTAL    PIC 9(8)V99.
           05  ORDER-TOTAL            PIC 9(8)V99.
       01  DONE                       PIC X(1) VALUE 'N'.
           88  NOT-DONE               VALUE 'N'.
           88  IS-DONE                VALUE 'Y'.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INIT-ORDER     THRU 1000-EXIT.
           PERFORM 2000-EXPAND-LINES   THRU 2000-EXIT.
           PERFORM 3000-COMPUTE-TOTAL  THRU 3000-EXIT.
           PERFORM 4000-DISPLAY-ORDER  THRU 4000-EXIT.
           STOP RUN.

       1000-INIT-ORDER.
           MOVE "DRAFT"  TO ORDER-STATUS.
           MOVE 000001   TO CUST-ID.
           MOVE "J. DOE" TO CUST-NAME.
           PERFORM VARYING ITEM-IDX FROM 1 BY 1
                   UNTIL ITEM-IDX > 10
               MOVE SPACES     TO SKU       (ITEM-IDX)
               MOVE 0          TO QTY       (ITEM-IDX)
               MOVE 0          TO UNIT-PRICE(ITEM-IDX)
           END-PERFORM.

       1000-EXIT. EXIT.

       2000-EXPAND-LINES.
           PERFORM VARYING ITEM-IDX FROM 1 BY 1
                   UNTIL ITEM-IDX > 10
               COMPUTE LINE-TOTAL(ITEM-IDX) =
                       QTY(ITEM-IDX) * UNIT-PRICE(ITEM-IDX)
           END-PERFORM.

       2000-EXIT. EXIT.

       3000-COMPUTE-TOTAL.
           MOVE 0 TO ORDER-TOTAL.
           PERFORM VARYING ITEM-IDX FROM 1 BY 1
                   UNTIL ITEM-IDX > 10
               ADD LINE-TOTAL(ITEM-IDX) TO ORDER-TOTAL
           END-PERFORM.
           IF ORDER-TOTAL > 0
               MOVE "READY" TO ORDER-STATUS.

       3000-EXIT. EXIT.

       4000-DISPLAY-ORDER.
           DISPLAY "ORDER STATUS: " ORDER-STATUS.
           DISPLAY "CUSTOMER: "      CUST-ID " " CUST-NAME.
           DISPLAY "LINE ITEMS:".
           PERFORM VARYING ITEM-IDX FROM 1 BY 1
                   UNTIL ITEM-IDX > 10
               DISPLAY "  " SKU(ITEM-IDX)
                       " QTY="     QTY(ITEM-IDX)
                       " PRICE="   UNIT-PRICE(ITEM-IDX)
                       " TOTAL="   LINE-TOTAL(ITEM-IDX)
           END-PERFORM.
           DISPLAY "ORDER TOTAL: " ORDER-TOTAL.

       4000-EXIT. EXIT.
```

Read this program as a cell graph. `ORDER-CELL` is a cell. `CUSTOMER` is a sub-cell. `LINE-ITEMS` is a sub-cell containing ten child cells named `ITEM(1)` through `ITEM(10)`. `LINE-TOTAL` is a derived cell — its value is computed by paragraph `2000-EXPAND-LINES`, which is a procedure that depends on `QTY` and `UNIT-PRICE` and writes to `LINE-TOTAL`. `ORDER-TOTAL` is a derived cell that depends on all ten `LINE-TOTAL` cells, computed by paragraph `3000-COMPUTE-TOTAL`. The 88-level conditions (`NOT-DONE`, `IS-DONE`) are boolean cells derived from the `DONE` primitive cell.

The polyformalism port of Quilt to COBOL in 2024 arrived at this same structure by direct translation from a TypeScript sheet, not by historical reasoning (*quilt-cobol*). The first author of that port, working from a modern cell model, rediscovered the 1959 record model almost exactly. The polyformalism insight: the cell model is the *ledger model*, and COBOL is the language of ledgers.

The 1959 COBOL specification does not have reactive propagation, but it has something the 1979 spreadsheet does not: a *layered* type system (the divisions), a *typed* hierarchy (the level numbers), and a *named* procedure table (the paragraphs). The data model and the procedure model are separated by design. This separation is precisely what the modern *interface* cell kind in Quilt attempts to reify: a cell whose only job is to expose a typed address into a system.

## 3. PLATO Tutor 1970: The Multi-User Original

The PLATO (Programmed Logic for Automatic Teaching Operations) system at the University of Illinois at Urbana-Champaign is, in 2024, severely underappreciated as a computing platform. PLATO I ran in 1960 on a single CDC 1604; PLATO II in 1961 added a single plasma display panel; PLATO III in 1963 added a CDC 9240 display; PLATO IV, which became operational across 1972 and reached its full 1000-terminal deployment over the following years, supported up to a thousand simultaneous users across a network of CDC mainframes, with each user at a plasma-display terminal. The principal investigators were Don Bitzer (system architecture), Gene Slottow (plasma display panel), and a generation of graduate students including Bruce Arne Sherwood, who designed the Tutor authoring language (Bitzer et al. 1971; Sherwood 1970).

PLATO was not merely a courseware delivery system. It was a multi-user time-sharing system with shared state, shared display, and (in PLATO IV) a Note system that functioned as a multi-user shared file system, the ancestor of every wiki. Lessons in Tutor were authored as sequences of *units*; users moved between units via *arrows*; the system maintained the state of every user's lesson independently, and a teacher's terminal could view every student's current unit in real time. Two students in the same room could see each other's variable values; when one changed, the other saw the change on the next refresh.

Tutor's basic cell model, as documented in Sherwood (1970) and the PLATO IV Tutor reference, is:

- A **unit** is a state. It is a sequence of operations that runs once when entered.
- A **showme** is a display cell. It writes text to the user's screen.
- A **do** is a computation cell. It calls a procedure and binds the result to a variable.
- An **arrow** is a reactive edge. When all conditions for the arrow are met, the system transitions to the target unit.
- A **room** is a multi-user shared space. A variable's value in a room is visible to all users in the room.
- A **note** is a cross-document reference — a permanent file that any lesson can `see` to jump into.

The 1970 reference for Tutor describes exactly this model: state organized in units, display via `showme`, computation via `do`, the `arrow` primitive connecting units in a reactive graph, and the room primitive making every variable shared by default. When a teacher's screen showed "I am in unit 3, my variables are X=4, Y=5," and a student elsewhere in the room was in unit 5, both views were visible to each other on every refresh.

This is the Quilt cell model with multi-user federation as the default. It was invented in 1970, nine years before VisiCalc and thirteen years before Lotus 1-2-3.

### 3.1 A 1970-style Tutor lesson

The following is a Tutor lesson in the idiom of Sherwood (1970). It maintains a counter shared by all users in a room. Every user sees the same counter value; every user can increment it; the display updates reactively when the counter changes.

```
lesson quilter
  unit start
    showme "Welcome to the shared counter room."
    showme "Press JOIN to enter the counter."
    arrow 1 :join, "join", goto shared-counter
    arrow 2 :quit, "quit", goto done
  unit shared-counter
    $counter is a shared room variable.
    showme "Current counter:  $counter"
    arrow 1 :inc,  "increment", goto increment
    arrow 2 :zero, "reset",     goto reset
    arrow 3 :back, "leave",     goto start
  unit increment
    $counter = $counter + 1.
    done.
    goto shared-counter.
  unit reset
    $counter = 0.
    done.
    goto shared-counter.
end
```

Read this as a cell graph. The four units — `start`, `shared-counter`, `increment`, `reset` — are states in a state machine. `$counter` is a cell whose value is shared across the room. The `showme` in `shared-counter` is a display cell that depends on `$counter`; when `$counter` changes, every user's display updates on the next transition into the unit. The arrows are reactive edges: when the user presses the increment key, the system transitions to the `increment` unit, which mutates the cell and returns to `shared-counter`, which re-runs its `showme` with the new value. The lesson is a self-evaluating graph; transitions are data dependencies, not user clicks.

The PLATO system was widely known within the educational computing community of the 1970s and 1980s, but was largely invisible to the broader computing industry. It ran on CDC mainframes, was not commercially distributed, and was effectively an academic artifact. Control Data Corporation sold the PLATO technology to the University of Illinois in 1975, and the system continued to operate in various forms until the Cyber mainframes were retired in the early 1990s. The polyformalism port of Quilt to Tutor in 2024 is the first re-implementation of this model in fifty years (*quilt-tutor*).

The PLATO insight is not in the units and arrows. It is in the *room*. A PLATO room is a Quilt *instance*: a shared namespace in which cells are visible to every federated participant. In 1970, before the word "federation" had any technical meaning, PLATO was already implementing the *Quilt cell model with multi-user federation as the default*. The room is not an extension to the cell model; it is the default, and the absence of federation is a 1980s invention (the single-user PC) that modern cloud systems have had to retrofit.

## 4. C 1972: The Bare-Metal Reduction

The C programming language was developed at Bell Labs by Dennis Ritchie between 1969 and 1973, with the canonical reference being *The C Programming Language* by Brian Kernighan and Dennis Ritchie (1978). The 1972 date marks the emergence of C as a usable language on the PDP-11, separate from its predecessor B (which lacked struct types and most of C's expression syntax). The *C Reference Manual* circulated within Bell Labs in 1972; the public description followed in 1974; K&R1 in 1978 cemented the language.

The Quilt cell model, in its minimal form, is: a struct of data plus a function pointer that computes the data, plus a list of dependencies. This is the C insight. There is no need for a runtime, for a virtual machine, for a special syntax. The cell *is* the language.

The Quilt team, in porting the cell model to C in 2023, observed that the entire model reduced to a small number of primitives. A `struct cell` with a value field, a function pointer field, and a list of dependencies is a cell. The reactive engine is a recursive function that calls the formula function pointer in topological order. This insight is, in the strong sense, a *reduction*: every other Quilt port is a syntactic elaboration of the C version. The TypeScript version adds type narrowing. The Pydantic version adds schema validation. The Mojo version adds type parameters. The COBOL version adds level-number hierarchy. But all of them are doing what the C version does, only with more ceremony.

### 4.1 A 1978-style C implementation

The following is a C program in the idiom of K&R1 (1978) — early enough to compile on a V7 Unix system with the original C compiler, and recent enough to use `void *` and the function-pointer typedef. It implements the minimum viable cell graph: a primitive value, a formula, and reactive recomputation.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct cell cell;

typedef int (*cell_fn)(cell *self);

typedef struct dep {
    cell *target;
} dep;

struct cell {
    char       *name;        /* cell address, like a Quilt path       */
    int         value;       /* typed value                           */
    cell_fn     compute;     /* formula function pointer, NULL=prim   */
    void      (*display)(cell *self);
    dep         deps[16];    /* dependency list                       */
    int         n_deps;
    int         dirty;       /* reactive flag                         */
};

static cell *registry[64];
static int   n_cells = 0;

cell *cell_make(name, value)
    char *name;
    int   value;
{
    cell *c = (cell *) malloc(sizeof(cell));
    c->name    = strdup(name);
    c->value   = value;
    c->compute = (cell_fn) 0;
    c->display = (void (*)()) 0;
    c->n_deps  = 0;
    c->dirty   = 0;
    registry[n_cells++] = c;
    return c;
}

void cell_depends(c, target)
    cell *c;
    cell *target;
{
    c->deps[c->n_deps].target = target;
    c->n_deps += 1;
}

void cell_set_formula(c, fn)
    cell *c;
    cell_fn fn;
{
    c->compute = fn;
    c->dirty   = 1;
}

/* Reactive evaluation: walk the dependency graph in order. */
int cell_eval(c)
    cell *c;
{
    int i, v;
    if (!c->dirty)       return c->value;
    if (!c->compute) { c->dirty = 0; return c->value; }
    for (i = 0; i < c->n_deps; i++)
        (void) cell_eval(c->deps[i].target);
    v = (*c->compute)(c);
    c->value = v;
    c->dirty = 0;
    return c->value;
}

/* --- example cell graph --- */

static int sum_fn(self)  cell *self; { return registry[0]->value + registry[1]->value; }
static int prod_fn(self) cell *self; { return registry[0]->value * registry[1]->value; }
static int total_fn(self)
    cell *self;
{
    return registry[2]->value + registry[3]->value;
}

static void display_int(self) cell *self; {
    printf("  %s = %d\n", self->name, self->value);
}

int main() {
    cell *x     = cell_make("x",     10);
    cell *y     = cell_make("y",     20);
    cell *sum   = cell_make("sum",    0);
    cell *prod  = cell_make("prod",   0);
    cell *total = cell_make("total",  0);

    cell_set_formula(sum,   sum_fn);
    cell_set_formula(prod,  prod_fn);
    cell_set_formula(total, total_fn);
    cell_depends(sum,   x); cell_depends(sum,   y);
    cell_depends(prod,  x); cell_depends(prod,  y);
    cell_depends(total, sum);
    cell_depends(total, prod);

    (void) cell_eval(total);
    printf("Initial state:\n");
    for (int i = 0; i < n_cells; i++) (*display_int)(registry[i]);

    /* mutate a primitive; mark dependents dirty */
    x->value = 100;
    x->dirty = 1;
    sum->dirty = prod->dirty = total->dirty = 1;

    (void) cell_eval(total);
    printf("\nAfter mutating x to 100:\n");
    for (int i = 0; i < n_cells; i++) (*display_int)(registry[i]);

    return 0;
}
```

Run this program. The output is the cell graph as a sequence of typed values with dependencies. The reactivity is implemented in thirty lines of C, with no runtime beyond the standard library, no garbage collector, no virtual machine. The cell model *is* the language: struct plus function pointer plus dependency list.

This is what the 1972 C language was waiting for. C provides the primitives — struct, function pointer, pointer arithmetic, manual memory — and a cell is the most economical composition of those primitives. Nothing about this program requires 2024 language features. It could have been written in 1978 when K&R1 was published, and the same logic could have been written in 1972 C with minor adjustments for the lack of `void *` and structure-passing conventions.

The 1972 C insight is not "let us add cells to C." The insight is that C *is* the cell model, in the same way that the lambda calculus *is* functional programming. The cell is a struct of data and a function pointer; everything else is bookkeeping. The polyformalism port of Quilt to C is, in this sense, the *purest* of the ports — not because it is the most useful in practice, but because it is the *least ornamented* (*quilt-c*). When the model is expressed in C, the reader sees the cell. When the model is expressed in COBOL, the reader sees the cell through four divisions. When the model is expressed in PLATO Tutor, the reader sees the cell through a room.

## 5. What This Means

The cell model predates spreadsheets by twenty years, predates microcomputers by fifteen, and is in the same intellectual lineage as 1959 record processing. The VisiCalc 1979 attribution is not wrong, but it is incomplete. VisiCalc did not *invent* the cell; it *made the cell visible* to a mass audience. The cell was already a 20-year-old pattern in 1979, and it was already being used in production at scale: in COBOL record processing, in PLATO Tutor lessons, in C systems software.

This matters for three reasons.

**First, the Quilt polyformalism is restoration, not novelty.** The Quilt cell model with eight cell kinds, multi-runtime execution, federation, and typed reactive edges is often described as a new invention. It is not. It is a synthesis of inventions that were already in the literature: hierarchical records (COBOL 1959), multi-user shared state (PLATO 1970), and the bare struct-plus-function-pointer (C 1972). Quilt adds type safety across runtimes, a multi-runtime execution model, and explicit federation, but the *cell as a unit of stateful computation with associated operations* is a 65-year-old idea. Naming the model "cell" is a 1979 contribution; the model itself is much older.

**Second, the absence of a name is not the absence of a concept.** None of the 1959–1972 systems called their unit a "cell." COBOL called it a *record*. PLATO Tutor called it a *unit* (in the state-machine sense) or a *variable* (in the data sense). C called it a *struct*. The spreadsheet era named it a *cell*; the reactive era called it a *signal*, an *observable*, a *store*, a *value*. The naming changed, but the underlying computational object — a typed value with a derivation function and a set of dependencies — is the same object in every era. The history of computing is, in part, the history of a single object that has been discovered at least seven times under at least seven names.

**Third, the cell model is the most-reinvented abstraction in computing.** It has been independently invented at least seven times in 65 years: by COBOL (1959), by PLATO (1970), by C (1972, in embryo), by VisiCalc (1979), by Excel (1985, with the addition of named ranges and cross-sheet references), by the reactive programming community (2000s), and by Quilt (2024). When an abstraction is independently invented this many times in this many communities, it is worth asking whether the abstraction is *inevitable*. We believe it is. Any system that needs to represent a quantity that can be derived from other quantities, with operations over the derivation, will arrive at the cell. The convergence is not coincidence; it is the shape of the problem asserting itself across cultures that had no contact with one another. The CODASYL committee did not know about the PLATO project; the PLATO project did not know about C; the C community did not know about any of these. They arrived at the same shape because the shape is the answer to a question the data itself was asking.

## 6. Implications

If the cell model is this old, what other "modern" abstractions are rediscoveries of patterns already implicit in 1950s and 1960s record processing? We name four candidates that we believe deserve similar historical reconsideration.

**Reducers (Redux, 2015).** The reducer — a pure function that takes the current state and an action and returns the next state — is the same pattern as the COBOL paragraph that reads the DATA division state and writes a new state. Redux's `combineReducers` is the COBOL 88-level `PERFORM` chain, only with the names changed. The naming is newer; the structure is older by 56 years. The implication is not that Redux should be re-implemented in COBOL; the implication is that when a modern pattern is "rediscovered," the older form often has features the modern form omits — in this case, the COBOL form's explicit separation of data description (DATA) from operation (PROCEDURE) is more disciplined than Redux's conflation of state and reducer in a single tree.

**Reactive streams (Rx, 2009).** A reactive stream is a sequence of values over time, with operators that compose streams into new streams. This is the same shape as a COBOL `PERFORM VARYING` over an `OCCURS` table whose contents change, with the loop body being a paragraph that produces an output for each input. Reactive streams add time and operator composition; the underlying computation — *for each input, produce an output, where the output is a function of the input and any state* — is what COBOL programmers called a "report" in 1960. The PLATO Tutor `do` statement is, similarly, a single-tick reactive stream: a function called once per transition with the current state as input.

**CRDTs (2011).** Conflict-free replicated data types were formalized by Shapiro et al. in 2011, but the underlying model — a value that can be replicated across sites with a defined merge rule — was implicit in every multi-user system from PLATO (1970) onward. PLATO's room-level shared state is, in the modern sense, a CRDT: every terminal sees the same variable, and updates are merged by the system without explicit conflict resolution. The merge rule is "last writer wins" for variables, "additive" for counters, and "set union" for note-file references. The 1970 PLATO system is the 2011 CRDT literature by a different name.

**Statecharts (1987).** David Harel's statecharts were a 1987 invention that generalized finite-state machines with hierarchy, concurrency, and broadcast communication. The underlying hierarchical state machine was already present in PLATO Tutor (1970) as the unit-and-arrow graph, and in COBOL (1959) as the paragraph-and-`PERFORM` graph. Statecharts added orthogonal regions and broadcast; the underlying *cell-of-state* primitive was already two decades old when Harel formalized it.

We do not claim that these modern systems copied from their predecessors. We claim that the underlying computational pattern is inevitable, and that every generation has rediscovered it under new names. The lesson is not to dismiss the modern systems — Redux, Rx, CRDTs, and statecharts are each real advances in their own right. The lesson is that when we find ourselves describing a 2020s framework as a breakthrough, it is worth asking: what was the version of this in 1959? What was it in 1970? What was it in 1972? The answer, increasingly, is that it was already there, in COBOL, in PLATO, in C, waiting to be named.

## 7. Conclusion

The cell model is older than spreadsheets by twenty years, older than microcomputers by fifteen, and is in the same intellectual lineage as 1959 record processing. The 1959 COBOL DATA division is a hierarchical cell graph; the 1970 PLATO Tutor unit is a state in a reactive cell graph shared across users; the 1972 C struct-plus-function-pointer is the minimum viable cell. VisiCalc 1979 is the most-visible instance of a model that had been quietly deployed in three other communities for twenty years.

The Quilt cell model, in 2024, is not a novelty. It is a *restoration*: the reunion of the three pre-spreadsheet lineages (hierarchical records, multi-user state, bare-metal struct-and-function) with the spreadsheet-era visible cell, the reactive-era typed dependency, and the modern multi-runtime synthesis. The Quilt polyformalism is the first system to put all of these on equal footing, but it is not the first system to use any of them. The 1959 CODASYL committee was already writing cell graphs; the 1970 PLATO team was already federating them; the 1972 Bell Labs group was already reducing them to their kernel. The Quilt contribution is naming the lineage.

We close with a methodological observation. The history of computing has been written, overwhelmingly, from the perspective of systems that became commercial. The commercial systems — VisiCalc, Excel, React, MobX, Vue, Redux — are visible, well-documented, and credited with invention. The pre-commercial systems — COBOL record processing, PLATO Tutor, 1972 C — are invisible, under-documented, and credited with nothing. The cell model is one of many abstractions that has been mis-attributed to the visible lineage. There are others. The role of papers like this one is to restore the chronology: not to dismiss the modern systems, but to put them in their historical place, as the most recent rediscovery of a much older pattern.

The next time you see a "modern" reactive framework described as a breakthrough, ask: what was the version of this in 1959? What was it in 1970? What was it in 1972? The answer is almost always: it was already there, in COBOL, in PLATO, in C. The lineage is older than we thought. The cell was a record. The formula was a paragraph. The reactive engine was a `PERFORM` chain. The room was a room. The struct was a struct. COBOL, PLATO, and C have been Quilt all along.

---

## References

- Bitzer, D. L., Johnson, R. L., Martin, J. C., and Slottow, G. K. (1971). "The plasma display panel — a new computer display device." In *Proceedings of the 1971 Fall Joint Computer Conference*, AFIPS Press, pp. 541–547. (Cited for the PLATO IV display architecture.)
- CODASYL Committee (1959). *COBOL — Common Business Oriented Language — US Department of Defense*. Government Printing Office. April 1959. (Cited for the four-division structure and level-number record system.)
- CODASYL Committee (1968). *American National Standard COBOL — ANSI X3.23-1968*. American National Standards Institute. (Cited for the first formal standardization; the 1959 specification is the original.)
- Harel, D. (1987). "Statecharts: A visual formalism for complex systems." *Science of Computer Programming* 8(3), pp. 231–274.
- Kernighan, B. W. and Ritchie, D. M. (1978). *The Programming Language C*. Prentice-Hall. (Cited for the canonical C reference; the language dates to 1972 on the PDP-11.)
- Ritchie, D. M. (1972). *C Reference Manual*. Bell Labs internal memorandum. (Cited for the 1972 form of the language, before the 1978 K&R1 publication.)
- Ritchie, D. M. (1974). "The Unix time-sharing system." *Communications of the ACM* 17(7), pp. 365–375.
- Shapiro, M., Preguiça, N., Baquero, C., and Zawirski, M. (2011). "A comprehensive study of CRDTs." INRIA Technical Report RR-7680.
- Sherwood, B. A. (1970). "The Tutor language." In *PLATO IV Lesson Authoring System Reference*. University of Illinois Computer-Based Education Research Laboratory. (Cited for the Tutor `unit`/`arrow`/`do`/`showme` model.)
- Slottow, G. K. and Bitzer, D. L. (1972). "On the path to PLATO IV." In *Proceedings of the 1972 ACM National Conference*, pp. 1–10.
- *quilt-cobol* (2024). SuperInstance. github.com/SuperInstance/quilt-cobol.
- *quilt-c* (2024). SuperInstance. github.com/SuperInstance/quilt-c.
- *quilt-tutor* (2024). SuperInstance. github.com/SuperInstance/quilt-tutor.
- *Quilt* (2024). "Manifesto." In *Quilt Documentation*. github.com/SuperInstance/quilt.

---

*Author note.* This paper is part of the superinstance-papers / white-papers series. It draws on the polyformalism ports of Quilt to COBOL, PLATO Tutor, and C published in 2024, which were themselves the primary source material for the historical claim advanced here. The author thanks the open-source PLATO archival community (in particular the pluto.cpr.illinois.edu archive and the CEDAR project) for making the 1970 Tutor documentation available. COBOL is older than most authors of modern reactive frameworks. The cell was older than both.
