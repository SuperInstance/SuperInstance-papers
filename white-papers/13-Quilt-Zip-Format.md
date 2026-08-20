```markdown
# The Quilt Zip Format: A Runnable File for Cellular Systems

## Abstract

The Quilt Zip Format (.qzt) is a file format designed to encapsulate the entirety of a Quilt cell system, enabling it to be saved, opened, extracted, imaged, diffed, shared, and run as a single file. This white paper outlines the rationale behind the .qzt format, its specification, asset model, openers, use cases, and implementation considerations.

## Introduction

The thesis of this paper is that a Quilt cell system, which is a collection of interconnected cells that process data in a cellular automaton-like fashion, should be representable as a single file. This file, known as a Quilt Zip Target (.qzt), should encapsulate the entire system state, including all cell values, allowing for a seamless workflow from creation to execution.

## The Format Spec

The .qzt format is a JSON-based specification that defines the structure of a Quilt cell system within a single file. The following is an example of a .qzt file:

```json
{
  "format": "quilt-z/1.0",
  "name": "my-fish-quilt",
  "created": "2026-08-20T...",
  "version": "1.0.0",
  "engine": "quilt-core@0.6.0",
  "cells": [
    {
      "path": "camera.feed",
      "kind": "api",
      "endpoint": "rtmp://camera-1/stream",
      "interval": 1
    },
    {
      "path": "vision.classifier",
      "kind": "formula",
      "depends_on": ["camera.feed"],
      "fn": "(ctx) => classify(ctx['camera.feed'])"
    }
    // ...
  ],
  "assets": {
    "training-data/pink-salmon-001.jpg": {
      "type": "image/jpeg",
      "data": "base64:...",
      "metadata": { "captured": "2026-08-15", "hold": "middle" }
    },
    "logs/2026-08-20.jsonl": {
      "type": "application/jsonl",
      "data": "base64:..."
    }
  },
  "external_refs": [
    { "path": "large-dataset.zip", "uri": "https://...", "checksum": "sha256:..." }
  ],
  "openers": {
    "ui": "ui-openers/web-form.js",
    "rest": "ui-openers/rest.js",
    "tts": "ui-openers/tts.js",
    "gpio": "ui-openers/servo.js"
  }
}
```

### Asset Model

Assets in a .qzt file can be either inline or referenced externally. Inline assets are base64-encoded and stored directly within the file, while referenced assets point to external locations, such as URLs or file paths, and include a checksum for integrity verification.

### Openers

The "openers" section of the .qzt format defines the rendering layer that allows users to interact with the Quilt cell system. Openers can be tailored for different interfaces, such as web forms, REST APIs, text-to-speech, and GPIO control.

## Use Cases

### Training Machine Learning Models

The .qzt format is particularly useful for training machine learning models. By encapsulating the entire training environment, including data, code, and dependencies, it enables reproducibility and sharing of training workflows.

### Sharing Quilt Sheets

Quilt sheets, which are collections of cells, can be easily shared as .qzt files, allowing for collaboration and distribution of complex data processing pipelines.

### Version Control

The .qzt format facilitates version control by allowing for diffs between versions of a Quilt cell system, making it easier to track changes and manage the evolution of a system over time.

### Federation

Federation of Quilt cell systems across different environments can be streamlined with the .qzt format, as it provides a standard way to package and distribute systems.

## The "Quilt Image" Concept

A "Quilt image" is a portable, single-file representation of a Quilt cell system. It is essentially a .qzt file packaged with all necessary assets and dependencies, allowing for easy deployment and execution in different environments.

## Implementation Notes

### Zip vs Custom Container

The .qzt format leverages the widely adopted ZIP file format for packaging, which provides a robust and efficient way to store and compress the contents of a Quilt cell system.

### Manifest

The manifest, or the JSON structure at the root of the .qzt file, serves as a central index for all components of the Quilt cell system, including cells, assets, external references, and openers.

## Comparison

### Docker

While Docker is widely used for containerization, the .qzt format offers a lighter-weight alternative for encapsulating and distributing Quilt cell systems, particularly those that do not require the overhead of a full container runtime.

### Jupyter Notebook

Jupyter notebooks are useful for data analysis and exploration but are not designed for the same level of cellular automation and system encapsulation provided by the .qzt format.

### .docx

The .qzt format is more structured and machine-readable than .docx, making it more suitable for automated processing and execution of complex data pipelines.

### .app

The .qzt format is more portable and platform-independent than traditional .app files, which are often tied to specific operating systems.

## Conclusion

The Quilt Zip Format (.qzt) provides a powerful and flexible way to package, distribute, and execute Quilt cell systems. By combining the benefits of a single-file representation with the ability to encapsulate an entire system state, the .qzt format enables new possibilities for collaboration, version control, and system federation in the realm of cellular computing.
```