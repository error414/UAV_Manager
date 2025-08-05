# CHANGELOG

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
*Added intelligent boundary system for more realistic