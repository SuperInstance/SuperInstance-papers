# Quilt Zip Format Specification (v2)

## Overview

The Quilt Zip Format (.qzt) is a JSON-based specification designed to encapsulate a collection of interactive cells, assets, and external references. This specification outlines the structure and requirements for the .qzt format, enabling the creation, execution, and management of Quilt sheets.

## JSON Schema for .qzt Format

Below is the complete JSON Schema for the .qzt format:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "format": {
      "type": "string",
      "pattern": "^quilt-z/[0-9]+\\.[0-9]+",
      "description": "The format version of the Quilt Zip file."
    },
    "name": {
      "type": "string",
      "description": "The name of the Quilt sheet."
    },
    "cells": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the cell."
          },
          "type": {
            "type": "string",
            "enum": ["text", "image", "code", "prompt"],
            "description": "The type of the cell."
          },
          "content": {
            "type": "string",
            "description": "The content of the cell."
          },
          "metadata": {
            "type": "object",
            "description": "Additional metadata for the cell."
          }
        },
        "required": ["id", "type", "content"]
      }
    },
    "assets": {
      "type": "object",
      "description": "A dictionary of assets referenced by the cells."
    },
    "external_refs": {
      "type": "array",
      "items": {
        "type": "string",
        "description": "External references used by the cells."
      }
    },
    "openers": {
      "type": "object",
      "description": "Configuration for opening the Quilt sheet."
    }
  },
  "required": ["format", "name", "cells"]
}
```

## Concrete Examples of .qzt Files

### 1. Simple Hello-World Sheet (5 Cells)

```json
{
  "format": "quilt-z/2.0",
  "name": "hello-world",
  "cells": [
    {
      "id": "cell-1",
      "type": "text",
      "content": "Hello, World!"
    },
    {
      "id": "cell-2",
      "type": "code",
      "content": "print('Hello, World!')",
      "metadata": {
        "language": "python"
      }
    },
    {
      "id": "cell-3",
      "type": "text",
      "content": "This is a simple Quilt sheet."
    },
    {
      "id": "cell-4",
      "type": "prompt",
      "content": "What is your name?"
    },
    {
      "id": "cell-5",
      "type": "text",
      "content": "Your name is {name}."
    }
  ],
  "assets": {},
  "external_refs": [],
  "openers": {}
}
```

### 2. Fish-Classifier Sheet (~12 Cells with Images)

```json
{
  "format": "quilt-z/2.0",
  "name": "fish-classifier",
  "cells": [
    {
      "id": "cell-1",
      "type": "text",
      "content": "Fish Classifier"
    },
    {
      "id": "cell-2",
      "type": "image",
      "content": "assets/fish1.jpg",
      "metadata": {
        "alt": "Fish Image 1"
      }
    },
    {
      "id": "cell-3",
      "type": "image",
      "content": "assets/fish2.jpg",
      "metadata": {
        "alt": "Fish Image 2"
      }
    },
    {
      "id": "cell-4",
      "type": "code",
      "content": "# Classifier code",
      "metadata": {
        "language": "python"
      }
    },
    {
      "id": "cell-5",
      "type": "prompt",
      "content": "Enter the fish name:"
    },
    {
      "id": "cell-6",
      "type": "text",
      "content": "The fish is {name}."
    }
  ],
  "assets": {
    "fish1.jpg": "assets/fish1.jpg",
    "fish2.jpg": "assets/fish2.jpg"
  },
  "external_refs": [],
  "openers": {}
}
```

### 3. Radio-Theater Sheet (~15 Cells with Character Prompts)

```json
{
  "format": "quilt-z/2.0",
  "name": "radio-theater",
  "cells": [
    {
      "id": "cell-1",
      "type": "text",
      "content": "Radio Theater"
    },
    {
      "id": "cell-2",
      "type": "prompt",
      "content": "Character 1: Hello, how are you?"
    },
    {
      "id": "cell-3",
      "type": "prompt",
      "content": "Character 2: I'm fine, thank you. And you?"
    },
    {
      "id": "cell-4",
      "type": "prompt",
      "content": "Character 1: I'm great, thanks for asking."
    },
    {
      "id": "cell-5",
      "type": "text",
      "content": "End of the conversation."
    }
  ],
  "assets": {},
  "external_refs": [],
  "openers": {}
}
```

## Runtime: Python Function to Load and Execute .qzt Files

```python
import json

def load_qzt_file(file_path):
    with open(file_path, 'r') as file:
        qzt_data = json.load(file)
    return qzt_data

def execute_cells(qzt_data):
    for cell in qzt_data['cells']:
        if cell['type'] == 'code':
            exec(cell['content'])
        elif cell['type'] == 'text':
            print(cell['content'])
        elif cell['type'] == 'image':
            print(f"Displaying image: {cell['content']}")
        elif cell['type'] == 'prompt':
            response = input(cell['content'])
            print(f"You entered: {response}")

def main():
    qzt_data = load_qzt_file('example.qzt')
    execute_cells(qzt_data)

if __name__ == "__main__":
    main()
```

## Save Path: Python Function to Write a .qzt File

```python
import json

def save_qzt_file(qzt_data, file_path):
    with open(file_path, 'w') as file:
        json.dump(qzt_data, file, indent=4)

# Example usage
qzt_data = {
    "format": "quilt-z/2.0",
    "name": "example-sheet",
    "cells": [
        {
            "id": "cell-1",
            "type": "text",
            "content": "Hello, World!"
        }
    ],
    "assets": {},
    "external_refs": [],
    "openers": {}
}

save_qzt_file(qzt_data, 'example.qzt')
```

## Diff Algorithm: Comparing Two .qzt Files

To compare two .qzt files, we can use a recursive approach to compare the JSON structures:

```python
import json

def diff_qzt_files(file1, file2):
    with open(file1, 'r') as f1, open(file2, 'r') as f2:
        data1 = json.load(f1)
        data2 = json.load(f2)

    return recursive_diff(data1, data2)

def recursive_diff(obj1, obj2):
    diff = {}
    for key in obj1:
        if key not in obj2:
            diff[key] = {"in_file1": obj1[key]}
        elif isinstance(obj1[key], dict) and isinstance(obj2[key], dict):
            sub_diff = recursive_diff(obj1[key], obj2[key])
            if sub_diff:
                diff[key] = sub_diff
        elif obj1[key] != obj2[key]:
            diff[key] = {"file1": obj1[key], "file2": obj2[key]}
    for key in obj2:
        if key not in obj1:
            diff[key] = {"in_file2": obj2[key]}
    return diff

# Example usage
diff_result = diff_qzt_files('file1.qzt', 'file2.qzt')
print(diff_result)
```

## Image Concept: Quilt as a Portable "Quilt Image"

The .qzt format can be thought of as a portable "Quilt image," similar to a Docker image. A Quilt image encapsulates a complete runtime environment, including cells, assets, and external references, allowing for easy sharing and execution of Quilt sheets across different platforms and environments.

The .qzt format provides a standardized way to package and distribute Quilt sheets, enabling users to create, share, and collaborate on interactive content more efficiently. By treating Quilt sheets as images, we can leverage existing tools and practices for version control, distribution, and execution, making it easier to manage and deploy Quilt-based applications.

In summary, the .qzt format is a versatile and powerful specification for creating, managing, and executing Quilt sheets. With its JSON-based structure, built-in diff algorithm, and portable image concept, the .qzt format provides a robust foundation for building and sharing interactive content across various platforms and environments.