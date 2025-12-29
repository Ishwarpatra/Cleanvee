# VeriClean Shared Schemas

This directory contains the **single source of truth** for all VeriClean data models.

## Why This Exists

**Problem**: Having separate TypeScript interfaces in `functions/` and Dart classes in `lib/` leads to drift. When you change one, the other breaks silently.

**Solution**: JSON Schema as the canonical definition, with auto-generated types for each platform.

## Structure

```
shared/
├── schemas/                    # JSON Schema definitions
│   ├── cleaning-log.schema.json
│   ├── checkpoint.schema.json
│   └── alert.schema.json
├── examples/                   # Example data for testing
│   └── cleaning-log.example.json
├── package.json                # Scripts for type generation
└── README.md
```

## Usage

### 1. Install Dependencies

```bash
cd shared
npm install
```

### 2. Generate Types

```bash
# Generate TypeScript types for Cloud Functions
npm run generate:ts
# Output: functions/src/types.generated.ts

# Generate Dart types for Flutter app
npm run generate:dart
# Output: lib/models/types.generated.dart

# Generate both
npm run generate:all
```

### 3. Validate Data

```bash
npm run validate
```

## Workflow

1. **Edit the schema** in `schemas/*.schema.json`
2. **Run generation** with `npm run generate:all`
3. **Import generated types** in your code:

   **TypeScript (Cloud Functions):**
   ```typescript
   import { CleaningLog, Alert, Checkpoint } from './types.generated';
   ```

   **Dart (Flutter):**
   ```dart
   import 'package:vericlean/models/types.generated.dart';
   ```

## Schema Guidelines

- Use `snake_case` for property names (Firestore convention)
- Include descriptions for all properties
- Use `$ref` for reusable definitions
- Add examples in `examples/` for complex types

## Adding a New Type

1. Create `schemas/my-type.schema.json`
2. Add example in `examples/my-type.example.json`
3. Run `npm run generate:all`
4. Import the generated type in your code
