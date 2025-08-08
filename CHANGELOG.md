# CHANGELOG

## [Version 1.4.1] - 2025-08-08
- Version display now sourced from frontend/public/app-version.json and fetched at runtime (no rebuild needed).
- Flight path utils: add time delta normalization, unify speed units, guard single-point ratio, deterministic circular turns, meter-based boundary margins.

## [Version 1.4.0] - 2025-08-06

### ✨ New Features
- **Circular Flight Boundaries**: Added optional circular boundary constraint centered at takeoff point
- **Boundary Priority System**: Circular boundaries take priority over rectangular boundaries when both are set
- **Enhanced Flight Path Control**: Improved synthetic flight path generation with circular containment options

## [Version 1.3.0] - 2025-08-05

### ✨ New Features
- **Flight Path Boundaries**: Added boundary constraints for synthetic flight path calculations
- **Configurable Limits**: Set maximum distances (meters) from takeoff in North/East/South/West directions
- **Automatic Turns**: Drone automatically turns when approaching boundary limits
- **Enhanced Modal**: Flight path calculation now includes optional boundary input fields

### 🔧 Improvements
- **Smart Turn Logic**: Gradual turns prevent unrealistic sharp direction changes
- **Median Speed Fix**: Boundaries prevent wandering issues with median speed calculations
- **Flexible Constraints**: Each direction can have different boundary distances

### 🐛 Bug Fixes
- Fixed synthetic flight path wandering problems
- Improved flight path realism with boundary enforcement

---
*Added intelligent boundary system for more realistic flight path generation*