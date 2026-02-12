# Torn.Space Developer Mode Guide

## Overview
Developer Mode is a comprehensive testing system that provides instant access to all game assets, bypasses normal progression mechanics, and enables advanced testing capabilities.

## Features

### 🎮 Instant Access
- **All Items Unlocked**: Access to all weapons and equipment
- **Max Level**: Instant rank 25 with max ship
- **Unlimited Resources**: Infinite money, ores, and materials
- **God Mode**: Invincibility for testing dangerous scenarios

### 🛠️ Testing Capabilities
- **Bypass Progression**: Skip normal leveling and grinding
- **Infinite Lives**: 999 lives for extended testing
- **Max Stats**: All stats (thrust, radar, agility, capacity, health, energy) maxed to level 10
- **Infinite Ammo**: Never run out of ammunition

## Admin Commands

### Primary Developer Mode Command

#### `/devmode <player>`
Toggles developer mode for the specified player. When enabled, automatically grants:
- Unlimited money (Number.MAX_SAFE_INTEGER / 2)
- Unlimited experience
- Rank 25 + Ship 25
- 999 lives
- Max stats (all at level 10)
- All weapon slots unlocked
- 999,999 of each resource (iron, silver, platinum, copper)
- God mode (invincibility) enabled by default
- Infinite ammo for all weapons

**Usage:**
```
/devmode YourUsername
```

**Example:**
```
/devmode TestPlayer
```

---

### Combat & Survival Commands

#### `/godmode`
Toggles invincibility for the current player. When enabled:
- No damage taken from any source
- "GOD MODE" text appears when hit
- Death is completely prevented
- Health automatically restored to max

**Usage:**
```
/godmode
```

**Status Messages:**
- `God Mode: ON` (green) when enabled
- `God Mode: OFF` (red) when disabled

---

### Equipment & Weapons Commands

#### `/unlockall`
Unlocks all weapon slots and fills them with powerful weapons:
- Unlocks all 10 weapon slots
- Equips top-tier weapons automatically:
  - Slot 1: Spreadshot (39)
  - Slot 2: Hadron Beam (8)
  - Slot 3: Swarm Missile (13)
  - Slot 4: EMP Mine (17)
  - Slot 5: Supercharger (36)
  - Slot 6: Warp Drive (29)
  - Slot 7: Hyperdrive (22)
  - Slot 8: Turbo (21)
  - Slot 9: Photon Cloak (19)
  - Slot 10: Hull Nanobots (18)
- Sets ammo to 999,999 for all slots

**Usage:**
```
/unlockall
```

#### `/giveweapon <player> <weaponID>`
Gives a specific weapon to any player by weapon ID.

**Usage:**
```
/giveweapon PlayerName 13
```

**Common Weapon IDs:**
- `1` - Pistol
- `2` - Reverse Gun
- `3` - Machine Gun
- `4` - Shotgun
- `5` - Cannon
- `6` - Minigun
- `7` - Plasma Beam
- `8` - Hadron Beam
- `9` - Laser Beam
- `10` - Missile
- `11` - Torpedo
- `12` - Nuke
- `13` - Swarm Missile
- `14` - Homing Missile
- `15` - Mine
- `16` - Laser Mine
- `17` - EMP Mine
- `18` - Hull Nanobots
- `19` - Photon Cloak
- `21` - Turbo
- `22` - Hyperdrive
- `29` - Warp Drive
- `36` - Supercharger
- `39` - Spreadshot

---

### Stats & Progression Commands

#### `/maxstats`
Maxes out all player upgrade stats to level 10:
- Thrust: 10
- Radar: 10
- Agility: 10
- Capacity: 10
- Max Health: 10
- Energy: 10

**Usage:**
```
/maxstats
```

#### `/setrank <rank>`
Sets your rank and ship level (0-25).

**Usage:**
```
/setrank 25
```

**Valid Values:** 0 through 25

#### `/setexp <amount>`
Sets your experience points to a specific amount.

**Usage:**
```
/setexp 1000000
```

#### `/setmoney <amount>`
Sets your money to a specific amount.

**Usage:**
```
/setmoney 10000000
```

---

### Utility Commands

#### `/refill`
Instantly refills:
- All ammo to maximum
- Health to maximum
- All resources (iron, silver, platinum, copper) to 999,999

**Usage:**
```
/refill
```

---

## Database Integration

Developer mode status is saved to the MongoDB database and persists across sessions:
- `isDeveloper` field tracks developer mode status
- Automatically loaded when player logs in
- Prevents loss of developer privileges on disconnect

## Permission Requirements

All developer mode commands require **ADMINPLUS** permissions (Admin or Owner tags).

### Permission Levels:
- `O` - Owner (tag: O)
- `A` - Admin (tag: A)

## Testing Scenarios

### Scenario 1: Testing New Weapons
```
/devmode YourName
/unlockall
```
Now you have access to all weapons for testing.

### Scenario 2: Testing High-Level Content
```
/setrank 25
/maxstats
/setmoney 999999999
```
Instantly access end-game content.

### Scenario 3: Combat Testing
```
/godmode
/refill
```
Test combat without risk of death.

### Scenario 4: Resource Testing
```
/refill
```
Instantly max out all resources for testing crafting/trading.

## Technical Details

### God Mode Implementation
- Checks in `dmg()` function prevent all damage
- Checks in `die()` function prevent death
- Health automatically restored when damage attempted
- Visual feedback with "GOD MODE" text on screen

### Resource Limits
- Money: Number.MAX_SAFE_INTEGER / 2 (to prevent overflow)
- Experience: Number.MAX_SAFE_INTEGER / 2
- Lives: 999
- Resources: 999,999 each
- Ammo: 999,999 per weapon

### Weapon Slot System
- Total weapon slots: 10
- Slot values:
  - `-2` = Locked slot
  - `-1` = Empty unlocked slot
  - `0+` = Weapon ID equipped

## Important Notes

⚠️ **Server-Wide Announcement**: When developer mode is toggled, all players see:
- `[PlayerName] is now in DEVELOPER MODE!` (when enabled)
- `[PlayerName] developer mode disabled.` (when disabled)

⚠️ **Persistence**: Developer mode status is saved to the database and persists across sessions.

⚠️ **Balance**: Developer mode completely bypasses game balance and progression. Use only for testing purposes.

⚠️ **Permissions**: Most commands require Admin+ permissions. Regular players cannot access these commands.

## Quick Reference

| Command | Purpose | Syntax |
|---------|---------|--------|
| `/devmode` | Toggle full developer mode | `/devmode PlayerName` |
| `/godmode` | Toggle invincibility | `/godmode` |
| `/unlockall` | Unlock all weapons | `/unlockall` |
| `/maxstats` | Max all stats | `/maxstats` |
| `/setrank` | Set rank level | `/setrank 25` |
| `/setexp` | Set experience | `/setexp 1000000` |
| `/setmoney` | Set money | `/setmoney 10000000` |
| `/refill` | Refill ammo/health/resources | `/refill` |
| `/giveweapon` | Give specific weapon | `/giveweapon Player 13` |

## Troubleshooting

### "Player not found"
- Ensure the player name is spelled correctly
- Player must be online
- Use exact case-sensitive name

### Commands not working
- Verify you have Admin or Owner permissions
- Check that the command syntax is correct
- Ensure you're using the correct parameter types (numbers for amounts)

### Developer mode not persisting
- Ensure the database connection is working
- Check MongoDB is running
- Verify the `isDeveloper` field is being saved

---

**Version:** 1.0  
**Last Updated:** 2026-02-12  
**Compatibility:** Torn.Space Server v1.0+
