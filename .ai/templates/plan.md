# Project Implementation Plan Template

Read `.ai/rules.md` first before starting implementation.

## 1. Project Overview

[Provide a brief overview of the project and its purpose]

This project focuses on [core functionality]. Future versions may include [potential future features].

## 2. Core User Flow

1. [First step in user flow]
2. [Second step in user flow]
3. [Third step in user flow]
4. [Fourth step in user flow]
5. [Fifth step in user flow]

## 3. Important Terminology

- **[Key Term 1]**: [Definition of the term and its significance in the project]
- **[Key Term 2]**: [Definition of the term and its significance in the project]

## 4. Technical Requirements

### Styling Guidelines

All client-side components MUST follow the comprehensive styling guide in `.ai/style-guide.md`.

Key requirements:

- Use SDK CSS classes for all UI elements
- Follow the component structure pattern in examples
- Use aliased imports and proper error handling
- Validate styling before submitting implementation

### Data Models

#### [Model Name 1]

```typescript
interface ExampleType {
  property1: string;
  property2: number;
  property3: {
    nestedProperty1: boolean;
    nestedProperty2: string;
  };
}
```

Example output:

```ts
{
  "property1": "example value",
  "property2": 123,
  "property3": {
    "nestedProperty1": true,
    "nestedProperty2": "example nested value"
  }
}
```

#### [Model Name 2]

```typescript
interface ExampleType2 {
  // Define another data model
}
```

## 5. User Stories & Acceptance Criteria

### Epic 1: [Epic Name]

#### User Story 1.1 - [User Story Title]

As a [user type], I want to [action] so that [benefit/value]

✅ Acceptance Criteria:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

#### User Story 1.2 - [User Story Title]

As a [user type], I want to [action] so that [benefit/value]

✅ Acceptance Criteria:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

### Epic 2: [Epic Name]

#### User Story 2.1 - [User Story Title]

As a [user type], I want to [action] so that [benefit/value]

✅ Acceptance Criteria:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## 6. Implementation Plan

### Server-side Components

- [List server-side files to be created/modified]
- [Controller for User Story 1.1]
- [Controller for User Story 1.2]

### Client-side Components

- [List client-side files to be created/modified]
- [Component for User Story 1.1]
- [Component for User Story 2.1]

### API Endpoints

```typescript
// POST /api/endpoint1
// Request: { param1: string, param2: number }
// Response: { success: true, data: ResponseType }

// GET /api/endpoint2
// Response: { success: true, data: ResponseType2[] }
```

### State Management

- [Describe how state will be managed, emphasizing use of GlobalContext]
- [Specify any state needed for User Story 1.1]
- [Specify any state needed for User Story 2.1]

## 7. Testing Approach

- [Describe how each user story will be tested]
- [Specify any mock data needed]

## 8. Validation Checklist

Before submitting the implementation, verify:

- [ ] All user stories are implemented according to acceptance criteria
- [ ] All UI elements use SDK classes, not Tailwind utilities
- [ ] All buttons use `.btn` classes, not custom styling
- [ ] All typography uses SDK classes (`.h1-h4`, `.p1-p4`)
- [ ] All imports use aliased paths, not relative paths
- [ ] Error handling uses GlobalContext
- [ ] Component structure follows the pattern in `.ai/examples/page.md`
- [ ] All API endpoints follow the established pattern and error handling
- [ ] Tests are included for all new functionality
