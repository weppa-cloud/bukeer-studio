# Architectural Violations Guide

## Common Violations

### 1. Service Pattern Violations

**Violation**: Direct service instantiation instead of AppServices

```dart
// WRONG
final service = ContactService();

// CORRECT
final service = appServices.contact;
```

**Detection**: Search for `= new *Service()` or `= *Service()`

### 2. FFAppState Usage

**Violation**: Using deprecated FFAppState instead of AppServices

```dart
// WRONG
FFAppState().someValue

// CORRECT
appServices.user.someValue
```

**Detection**: Search for `FFAppState`

### 3. Business Logic in UI

**Violation**: Complex logic in Widget build methods

```dart
// WRONG
Widget build(BuildContext context) {
  final total = items.fold(0, (sum, item) => sum + item.price);
  final discount = total > 1000 ? total * 0.1 : 0;
  final finalPrice = total - discount;
  // ...
}

// CORRECT
Widget build(BuildContext context) {
  final pricing = appServices.pricing.calculate(items);
  // ...
}
```

**Detection**: Check build methods for >10 lines of logic

### 4. Missing Permission Checks

**Violation**: Privileged operations without authorization

```dart
// WRONG
await appServices.itinerary.delete(id);

// CORRECT
if (appServices.authorization.canDeleteItinerary()) {
  await appServices.itinerary.delete(id);
}
```

**Detection**: Search for `.delete(`, `.update(` without nearby `can*()` check

### 5. Direct Database Access

**Violation**: Bypassing repository/service layer

```dart
// WRONG
final result = await supabase.from('contacts').select();

// CORRECT
final result = await appServices.contact.getAll();
```

**Detection**: Search for `supabase.from(` in UI/widget files

### 6. Hardcoded Values

**Violation**: Magic numbers, hardcoded strings

```dart
// WRONG
if (role == 'Admin')
color: Color(0xFF6750A4)
padding: EdgeInsets.all(16)

// CORRECT
if (role == UserRole.admin)
color: Theme.of(context).colorScheme.primary
padding: EdgeInsets.all(BukeerSpacing.s)
```

### 7. Missing Error Handling

**Violation**: Async operations without try-catch

```dart
// WRONG
final data = await appServices.contact.create(input);

// CORRECT
try {
  final data = await appServices.contact.create(input);
} catch (e) {
  appServices.error.handleError(e, 'Failed to create contact');
}
```

### 8. BuildContext After Async

**Violation**: Using context without mounted check

```dart
// WRONG
await someAsyncOperation();
Navigator.of(context).pop();

// CORRECT
await someAsyncOperation();
if (mounted) {
  Navigator.of(context).pop();
}
```

### 9. Circular Dependencies

**Violation**: Module A imports Module B which imports Module A

**Detection**: Run `flutter analyze` or check imports graph

### 10. Missing Resource Disposal

**Violation**: Controllers not disposed

```dart
// WRONG
class _MyState extends State<MyWidget> {
  final controller = TextEditingController();
}

// CORRECT
class _MyState extends State<MyWidget> {
  late final TextEditingController controller;

  @override
  void initState() {
    super.initState();
    controller = TextEditingController();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
}
```

## Violation Impact Levels

| Level | Description | Action |
|-------|-------------|--------|
| Critical | Security, data loss | Fix immediately |
| High | Crashes, data corruption | Fix in current sprint |
| Medium | Performance, maintainability | Schedule for fix |
| Low | Code style, minor issues | Fix when touching file |

## Detection Commands

```bash
# FFAppState usage
grep -r "FFAppState" lib/

# Direct Supabase access in UI
grep -r "supabase.from" lib/bukeer/

# Missing error handling (async without try)
grep -r "await appServices" lib/ | grep -v "try"

# Hardcoded colors
grep -r "Color(0x" lib/
```
