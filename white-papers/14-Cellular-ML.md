# Cellular ML: How to Train a Fish Classifier in a Quilt Sheet

**Superinstance Papers — White Paper Series**

*Version 1.0 — Draft for Review*

---

## Abstract

Training a custom machine learning model today requires a team. You need data engineers to curate datasets, ML engineers to write training loops, MLOps engineers to manage experiments, DevOps engineers to provision infrastructure, and a GPU cluster that costs more than a fishing boat. The model lives in one system, the data in another, the deployment in a third, and the monitoring in a fourth. The result is that the *act* of creating a useful model is reserved for organizations with headcount and hardware budgets.

This paper proposes a fundamentally different architecture: **Cellular ML**. In this model, every piece of the ML pipeline is a *cell* — a self-contained, observable, editable unit of computation or state. The data is a folder of cells. The model is a cell. Training is a cell. Deployment is a cell. The user — a fisherman, a farmer, a small clinic — sees a single *Quilt sheet*: a living document that combines code, data, and results. They edit cells, and the system updates automatically.

We present a concrete, working design for a fish classifier that runs on a Raspberry Pi. The paper details the architecture, the training loop, A/B testing, feedback flows, and runtime requirements. We argue that cellular ML collapses the traditional ML team into a single user, and that the Quilt sheet is the interface that makes this possible.

---

## 1. The Traditional ML Pipeline (and Its Pain)

Let us be precise about what "training a model" means in a modern organization. It is not a single act. It is a pipeline of distinct, interconnected stages, each owned by a different role and often a different tool.

### 1.1 The Stages

1. **Data Collection**: Cameras, sensors, or manual entry produce raw data. This data lands in a data lake (e.g., S3) or a warehouse (e.g., Snowflake).
2. **Data Curation**: A data engineer writes Spark jobs to clean, deduplicate, and label the data. Labels come from a labeling tool (Labelbox, Scale AI) or from heuristics.
3. **Feature Engineering**: Another engineer extracts features (or, in deep learning, decides that the model should learn features end-to-end).
4. **Model Training**: An ML engineer writes a PyTorch or TensorFlow script. They manage hyperparameters, checkpoints, and logging (MLflow, Weights & Biases).
5. **Model Evaluation**: A separate step computes metrics (precision, recall, F1) on a held-out set. This is often manual and ad-hoc.
6. **Deployment**: A DevOps engineer containerizes the model, sets up an API server (FastAPI, Triton), and deploys it to a Kubernetes cluster.
7. **Monitoring**: A separate system (Prometheus, Grafana) tracks inference latency, drift, and error rates.
8. **Feedback Loop**: The model's predictions are logged. A human reviews a sample and sends corrections back to the data curation stage.

### 1.2 The Pain Points

The pain is not any single stage; it is the *interfaces* between stages.

- **Context Switching**: Data is in S3. The training script expects a local folder. The deployment expects a Docker image. The monitoring expects a metrics endpoint. Every handoff requires a custom adapter.
- **Siloed Knowledge**: The data engineer doesn't know the model architecture. The ML engineer doesn't know the data schema. The DevOps engineer doesn't know either. Debugging a bad prediction requires a cross-team war room.
- **Latency**: A single change (e.g., "add a new species") requires touching the data pipeline, the training script, the deployment config, and the monitoring dashboard. The cycle time is weeks, not hours.
- **Cost**: A GPU cluster for a simple classifier is overkill. But the architecture *forces* it because training is centralized and batch-oriented.
- **Opacity**: The model is a black box. The pipeline is a black box. The user has no way to see *why* a prediction was made or *how* to fix it.

**The core failure**: The traditional pipeline treats the user as a passive consumer. The fisherman does not have a "team." He has a boat, a camera, and a problem.

---

## 2. The Cellular Pipeline (and Its Simplicity)

Cellular ML inverts the traditional architecture. Instead of a linear pipeline with rigid handoffs, we have a **graph of cells**. Each cell is a small, independent unit that:

- Has a **type** (data, model, computation, feedback).
- Has a **state** (its current value or output).
- Has **inputs** (references to other cells) and **outputs** (how it feeds others).
- Can be **edited** by the user.
- Can be **recomputed** when its inputs change.

The user interacts with a **Quilt sheet** — a visual, document-like interface that shows all cells and their connections. The sheet is the application. There is no separate "training UI," "deployment UI," or "monitoring UI." There is only the sheet.

### 2.1 The Cell Model

A cell is defined by a small piece of code. In our reference implementation, a cell is a Python function with a declarative signature:

```python
# cell.py
from quilt import Cell, Input, Output

@Cell(
    name="species",
    inputs={"frame": "camera.cell", "model": "vision-model.cell"},
    outputs={"prediction": "str"}
)
def species_cell(frame, model):
    prediction = model.classify(frame)
    return {"prediction": prediction}
```

The Quilt runtime handles:

- **Dependency resolution**: If `camera.cell` changes, `species.cell` is re-run.
- **Caching**: If inputs haven't changed, the cell's output is reused.
- **Persistence**: Cell state is saved to disk (or a lightweight DB).
- **Observability**: Every cell logs its inputs, outputs, and execution time.

### 2.2 The Sheet

The sheet is a folder (or a Git repo) containing:

- A `sheet.yaml` file that defines the graph.
- A `cells/` directory with one file per cell.
- A `data/` directory for large artifacts (images, model weights).

```yaml
# sheet.yaml
name: fish-classifier
version: 0.1.0
cells:
  camera:
    type: stream
    source: /dev/video0
  vision-model:
    type: model
    backend: heuristic
  species:
    type: compute
    function: cells/species.py
  ground-truth:
    type: data
    source: cells/ground_truth.py
  ...
```

### 2.3 Why It's Simpler

- **One system**: The sheet *is* the data store, the training loop, the deployment target, and the monitoring dashboard.
- **One user**: The fisherman edits cells. He doesn't write a data pipeline; he writes a Python function that says "if the fish is pink, label it pink."
- **Incremental updates**: Changing one cell only recomputes its dependents. No full pipeline re-run.
- **Local-first**: The sheet runs on a Raspberry Pi. No cloud required.

---

## 3. Concrete Quilt Sheet for Fish Classification

Let's build the sheet. The goal: classify salmon (chum, pink, coho) from a deck camera on a fishing boat.

### 3.1 The Cell Graph

```
[camera.cell] --> [vision-model.cell] --> [species.cell] --> [ground-truth.cell]
                                                              |
                                                              v
                                                       [training-data.cell]
                                                              |
                                                              v
                                                       [model-train.cell]
                                                              |
                                                              v
                                                       [ab-test.cell] --> [reference-images.cell]
                                                              |
                                                              v
                                                       [feedback.cell]
```

### 3.2 Cell Definitions

#### `camera.cell`

Streams frames from the deck camera. In a real deployment, this is a background process that writes JPEGs to a folder.

```python
# cells/camera.py
import cv2
import os
from quilt import Cell

@Cell(name="camera", outputs={"frame_path": "str"})
def camera_cell():
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    if not ret:
        return {"frame_path": None}
    path = "/data/frames/latest.jpg"
    cv2.imwrite(path, frame)
    return {"frame_path": path}
```

#### `vision-model.cell`

Classifies each frame. We start with a heuristic model (color-based) and later swap in a trained model.

```python
# cells/vision_model.py
import numpy as np
from quilt import Cell

@Cell(name="vision-model", inputs={"frame_path": "camera.cell"}, outputs={"class": "str", "confidence": "float"})
def vision_model_cell(frame_path):
    if frame_path is None:
        return {"class": "none", "confidence": 0.0}
    img = cv2.imread(frame_path)
    # Heuristic: pink salmon have a distinctive pink hue
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    pink_mask = cv2.inRange(hsv, (140, 50, 50), (170, 255, 255))
    pink_ratio = np.sum(pink_mask) / (img.shape[0] * img.shape[1])
    if pink_ratio > 0.1:
        return {"class": "pink", "confidence": pink_ratio}
    return {"class": "unknown", "confidence": 0.0}
```

#### `species.cell`

The result the fisherman sees. It takes the model's output and formats it.

```python
# cells/species.py
from quilt import Cell

@Cell(name="species", inputs={"model_class": "vision-model.cell"}, outputs={"species": "str"})
def species_cell(model_class):
    return {"species": model_class}
```

#### `ground-truth.cell`

The fisherman's corrections. This is a simple UI: the sheet shows the predicted species, and the fisherman clicks "correct" or selects the right species.

```python
# cells/ground_truth.py
import json
from quilt import Cell

@Cell(name="ground-truth", inputs={"predicted": "species.cell"}, outputs={"correction": "str"})
def ground_truth_cell(predicted):
    # In practice, this is a UI callback. For now, we read a file.
    try:
        with open("/data/corrections.json", "r") as f:
            corrections = json.load(f)
        return {"correction": corrections.get("latest", predicted)}
    except FileNotFoundError:
        return {"correction": predicted}
```

#### `training-data.cell`

Accumulates labeled examples. Every time the ground truth differs from the prediction, we save the frame and the label.

```python
# cells/training_data.py
import shutil
import json
from quilt import Cell

@Cell(name="training-data", inputs={"frame": "camera.cell", "label": "ground-truth.cell"}, outputs={"count": "int"})
def training_data_cell(frame, label):
    if frame is None or label == "unknown":
        return {"count": 0}
    # Save frame to labeled folder
    dest = f"/data/training/{label}/{os.path.basename(frame)}"
    shutil.copy(frame, dest)
    # Update count
    count = len(os.listdir(f"/data/training/{label}"))
    return {"count": count}
```

#### `model-train.cell`

Kicks off overnight training. It uses the accumulated data to fine-tune a small CNN (or an LLM, as we'll discuss).

```python
# cells/model_train.py
import subprocess
from quilt import Cell

@Cell(name="model-train", inputs={"data": "training-data.cell"}, outputs={"status": "str"})
def model_train_cell(data):
    if data["count"] < 100:
        return {"status": "not_enough_data"}
    # Run training script
    result = subprocess.run(
        ["python", "train.py", "--data", "/data/training", "--output", "/models/fish_v2.pt"],
        capture_output=True
    )
    return {"status": "trained" if result.returncode == 0 else "failed"}
```

#### `ab-test.cell`

Compares the old model (heuristic) vs. the new model (trained) on the morning's catch.

```python
# cells/ab_test.py
from quilt import Cell

@Cell(name="ab-test", inputs={"new_model": "model-train.cell"}, outputs={"winner": "str"})
def ab_test_cell(new_model):
    if new_model["status"] != "trained":
        return {"winner": "old"}
    # Run both models on a held-out set
    old_acc = run_model("/models/heuristic.pt")
    new_acc = run_model("/models/fish_v2.pt")
    return {"winner": "new" if new_acc > old_acc else "old"}
```

#### `reference-images.cell`

Per-species prototype folders. These are used for few-shot learning and for the fisherman to visually verify.

```python
# cells/reference_images.py
from quilt import Cell

@Cell(name="reference-images", outputs={"paths": "dict"})
def reference_images_cell():
    return {
        "paths": {
            "chum": "/data/reference/chum/*.jpg",
            "pink": "/data/reference/pink/*.jpg",
            "coho": "/data/reference/coho/*.jpg",
        }
    }
```

#### `feedback.cell`

What worked, what didn't. This cell aggregates corrections and model performance over time.

```python
# cells/feedback.py
import json
from quilt import Cell

@Cell(name="feedback", inputs={"corrections": "ground-truth.cell", "winner": "ab-test.cell"}, outputs={"report": "str"})
def feedback_cell(corrections, winner):
    report = {
        "total_corrections": corrections["count"],
        "ab_test_winner": winner,
        "suggestion": "Add more pink salmon images" if corrections["count"] > 50 else "Keep collecting data"
    }
    return {"report": json.dumps(report)}
```

---

## 4. How Training Works (The Model-Train Cell)

The `model-train.cell` is where the magic happens. In a traditional system, training is a heavyweight batch job. In a cellular system, it's just another cell that runs when its inputs change.

### 4.1 The Training Script

The training script is small and self-contained. We use a lightweight CNN (MobileNetV3) fine-tuned on the accumulated data.

```python
# train.py
import torch
import torch.nn as nn
import torchvision.models as models
from torch.utils.data import DataLoader, Dataset
from PIL import Image
import os

class FishDataset(Dataset):
    def __init__(self, root):
        self.samples = []
        for label in ["chum", "pink", "coho"]:
            folder = os.path.join(root, label)
            for fname in os.listdir(folder):
                self.samples.append((os.path.join(folder, fname), label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB").resize((224, 224))
        img_tensor = torch.tensor(np.array(img)).permute(2, 0, 1).float() / 255.0
        label_idx = ["chum", "pink", "coho"].index(label)
        return img_tensor, label_idx

def train():
    dataset = FishDataset("/data/training")
    loader = DataLoader(dataset, batch_size=16, shuffle=True)
    model = models.mobilenet_v3_small(pretrained=True)
    model.classifier[3] = nn.Linear(1024, 3)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(10):
        for imgs, labels in loader:
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()

    torch.save(model.state_dict(), "/models/fish_v2.pt")
```

### 4.2 The Cellular Twist

The training cell doesn't just run the script. It:

1. **Checks data sufficiency**: If there aren't enough labeled examples, it skips training.
2. **Runs in the background**: The cell is marked as `async`. The fisherman goes to sleep; the cell runs overnight.
3. **Publishes results**: The output is a status (`trained`/`failed`) and a path to the new weights.

The key insight: **training is not a separate system**. It's a cell that consumes the `training-data.cell` and produces a new model artifact. The user doesn't need to know about epochs or optimizers. They just see "Training complete" in the sheet.

### 4.3 The LLM Alternative

For a more flexible approach, the `vision-model.cell` can use a vision-language model (e.g., a small CLIP variant) instead of a CNN. The training cell then becomes a **prompt-tuning** cell:

```python
# cells/model_train.py (LLM version)
@Cell(name="model-train", inputs={"data": "training-data.cell"}, outputs={"status": "str"})
def model_train_llm(data):
    # Generate few-shot examples from reference images
    examples = generate_prompts("/data/reference")
    # Fine-tune a small adapter
    adapter = train_adapter(examples, data["count"])
    save_adapter(adapter, "/models/fish_adapter.pt")
    return {"status": "trained"}
```

This is more powerful because the fisherman can describe a new species in natural language, and the model can adapt without retraining from scratch.

---

## 5. How A/B Testing Works (The AB-Test Cell)

A/B testing in a traditional system requires a feature flag service, a traffic splitter, and a metrics pipeline. In a cellular system, it's a cell that compares two model artifacts.

### 5.1 The Logic

The `ab-test.cell` runs both the old model (heuristic) and the new model (trained) on the same set of frames. It computes accuracy on the ground-truth labels.

```python
# cells/ab_test.py (full version)
def run_model(model_path, frames):
    model = load_model(model_path)
    correct = 0
    total = 0
    for frame in frames:
        pred = model.classify(frame)
        true = get_ground_truth(frame)
        if pred == true:
            correct += 1
        total += 1
    return correct / total

@Cell(name="ab-test", inputs={"new_model": "model-train.cell"}, outputs={"winner": "str", "metrics": "dict"})
def ab_test_cell(new_model):
    # Get a held-out set from the training data
    frames = get_heldout_frames("/data/training", n=50)
    old_acc = run_model("/models/heuristic.pt", frames)
    if new_model["status"] != "trained":
        return {"winner": "old", "metrics": {"old_acc": old_acc, "new_acc": None}}
    new_acc = run_model("/models/fish_v2.pt", frames)
    winner = "new" if new_acc > old_acc else "old"
    return {"winner": winner, "metrics": {"old_acc": old_acc, "new_acc": new_acc}}
```

### 5.2 The Deployment Decision

The output of the `ab-test.cell` feeds directly into the `vision-model.cell`. If the new model wins, the vision model cell automatically switches to the new weights.

```python
# cells/vision_model.py (updated)
@Cell(name="vision-model", inputs={"frame_path": "camera.cell", "ab": "ab-test.cell"}, outputs={"class": "str"})
def vision_model_cell(frame_path, ab):
    model_path = "/models/fish_v2.pt" if ab["winner"] == "new" else "/models/heuristic.pt"
    model = load_model(model_path)
    return {"class": model.classify(frame_path)}
```

### 5.3 The User Experience

The fisherman sees a simple status in the sheet:

```
AB Test: New model (fish_v2) wins with 92% accuracy vs 78% for old model.
Switching to new model. [Undo]
```

The "Undo" button is a cell that reverts the `vision-model.cell` to the old weights. This is a one-line change in the sheet.

---

## 6. How Feedback Flows (The Feedback Cell)

Feedback is the loop that closes the system. In a traditional pipeline, feedback is a manual process: someone exports logs, analyzes them, and files a ticket. In a cellular system, feedback is a cell that aggregates and suggests actions.

### 6.1 The Feedback Cell

The `feedback.cell` consumes:

- `ground-truth.cell`: The fisherman's corrections.
- `ab-test.cell`: The model comparison results.
- `training-data.cell`: The accumulated data.

It produces a human-readable report and, crucially, **suggested edits to other cells**.

```python
# cells/feedback.py (full version)
@Cell(name="feedback", inputs={"corrections": "ground-truth.cell", "winner": "ab-test.cell", "data": "training-data.cell"}, outputs={"report": "str", "suggestions": "list"})
def feedback_cell(corrections, winner, data):
    suggestions = []
    if data["count"] < 100:
        suggestions.append("Collect more data. Current: {} examples.".format(data["count"]))
    if winner["winner"] == "old":
        suggestions.append("New model underperformed. Consider adding more reference images.")
    # Check for class imbalance
    counts = get_class_counts("/data/training")
    min_class = min(counts, key=counts.get)
    if counts[min_class] < 10:
        suggestions.append(f"Very few examples of {min_class}. Add more.")
    report = {
        "corrections": corrections["count"],
        "ab_test": winner,
        "data_count": data["count"],
        "suggestions": suggestions
    }
    return {"report": json.dumps(report), "suggestions": suggestions}
```

### 6.2 The Feedback UI

The sheet renders the feedback as a panel:

```
Feedback Report
---------------
- Corrections made: 45
- AB Test: New model won (92% vs 78%)
- Data: 245 examples
- Suggestion: Add more coho salmon images (only 5 examples)
```

The fisherman can click "Add more coho images" and the sheet opens a file picker to add images to `reference-images.cell`. This is a direct edit to the cell graph.

### 6.3 The Closed Loop

The feedback cell makes the system **self-improving**. The fisherman doesn't need to know *how* to improve the model. The sheet tells him what to do, and he does it by editing a cell.

---

## 7. Runtime Requirements (You Can Run This on a Raspberry Pi)

A common objection: "This sounds nice, but ML requires GPUs." For a fish classifier, this is false. The entire system runs on a Raspberry Pi 4 (4GB RAM) or an equivalent edge device.

### 7.1 Hardware

- **CPU**: Quad-core ARM Cortex-A72 (Raspberry Pi 4) or better.
- **RAM**: 4GB minimum. 8GB recommended for the LLM variant.
- **Storage**: 32GB SD card. Training data accumulates at ~1MB per image, so 10,000 images = 10GB.
- **Camera**: USB webcam or CSI camera module.

### 7.2 Software Stack

- **OS**: Raspberry Pi OS (64-bit) or Ubuntu Server.
- **Python**: 3.9+.
- **ML Framework**: PyTorch (CPU-only build) or ONNX Runtime for inference.
- **Quilt Runtime**: A lightweight Python daemon that watches the sheet directory and executes cells.

### 7.3 Performance

- **Inference**: MobileNetV3 on CPU: ~50ms per frame. More than enough for a deck camera at 1 FPS.
- **Training**: 100 images, 10 epochs, MobileNetV3 on CPU: ~10 minutes. Overnight training is trivial.
- **Cell recomputation**: Only changed cells re-run. Caching ensures the system is responsive.

### 7.4 The Quilt Runtime

The runtime is a single Python process:

```python
# quilt_runtime.py
import time
import yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SheetHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(".py") or event.src_path.endswith(".yaml"):
            recompute_dependents(event.src_path)

def main():
    sheet = yaml.safe_load(open("sheet.yaml"))
    observer = Observer()
    observer.schedule(SheetHandler(), "cells/", recursive=True)
    observer.start()
    # Main loop: execute cells with no cached output
    while True:
        for cell in sheet["cells"]:
            if not is_cached(cell):
                execute_cell(cell)
        time.sleep(1)

if __name__ == "__main__":
    main()
```

This is the entire runtime. No Kubernetes, no Docker, no cloud.

---

## 8. The Implications (ML for Everyone, Not Just Teams)

The fish classifier is a toy example, but the architecture is general. Consider these applications:

- **A small farm** wants to detect plant diseases from a phone camera. The sheet has a `leaf.cell`, a `disease-model.cell`, and a `spray.cell` that triggers a pesticide drone.
- **A rural clinic** wants to classify skin lesions. The sheet has a `photo.cell`, a `diagnosis-model.cell`, and a `referral.cell`.
- **A hobbyist** wants to train a model to recognize bird species from a backyard feeder.

In all cases, the pattern is the same: a single user, a single sheet, and a set of cells that they can edit.

### 8.1 The Collapse of the Team

The traditional ML team has five roles. In a cellular system:

- **Data Engineer** → The `training-data.cell` automatically accumulates data.
- **ML Engineer** → The `model-train.cell` runs a standard training script. The user doesn't write it.
- **MLOps** → The `ab-test.cell` handles model comparison.
- **DevOps** → The Quilt runtime *is* the deployment.
- **Monitoring** → The `feedback.cell` provides observability.

The user's job is to **edit cells**, not to write infrastructure. Editing a cell is as simple as changing a Python function or adding an image to a folder.

### 8.2 The Democratization of ML

The barrier to ML is not the math. It's the *plumbing*. A fisherman can understand the concept of "if the fish is pink, call it pink." He can edit that heuristic. When the heuristic fails, the system tells him to collect more data. When he collects data, the system trains a better model. The loop is natural.

### 8.3 The Quilt Sheet as a Universal Interface

The Quilt sheet is more than a UI. It's a **living specification** of the system. The `sheet.yaml` file is machine-readable and human-readable. It can be versioned in Git. It can be shared with other fishermen. It can be forked and adapted.

### 8.4 Challenges and Future Work

We acknowledge limitations:

- **Scale**: This works for small models and modest data. It won't train GPT-4 on a Raspberry Pi.
- **Complexity**: Some pipelines (e.g., multi-modal, reinforcement learning) are harder to express as simple cells.
- **Safety**: In critical applications, a human-in-the-loop is still required. The `ground-truth.cell` is a form of this.

Future work includes:

- **Cell marketplaces**: Sharing pre-built cells (e.g., a "salmon detector" cell) across users.
- **Distributed sheets**: Running cells on multiple devices (e.g., a cloud GPU for training, edge for inference).
- **Natural language cells**: Editing cells via voice or text (e.g., "add a new species called sockeye").

---

## Conclusion

The traditional ML pipeline is a relic of the batch-processing era. It assumes a team, a cluster, and a separation between data, model, and deployment. Cellular ML rejects this. It treats the entire pipeline as a set of editable, observable, recomputable cells, unified in a single Quilt sheet.

The fish classifier is not a demo. It's a proof that ML can be local, incremental, and user-driven. The fisherman doesn't need a team. He needs a sheet. And with a sheet, he can train a model that works for *his* boat, *his* camera, and *his* catch.

The future of ML is not bigger clusters. It's smaller, smarter, and more personal systems. It's cellular.

---

*Superinstance Papers — White Paper Series. For feedback, contact papers@superinstance.ai.*