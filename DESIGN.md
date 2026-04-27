# DESIGN.md - DesignedByCommittee

## Project Vision: "The Luminous Obsidian"
DesignedByCommittee is a collaborative UI design platform where design decisions are made collectively. The interface itself reflects this high-end, editorial collaboration environment, prioritizing focus, tonal depth, and optical physics over standard flat UI patterns.

## Core Design Principles
1. **Tonal Depth**: Define boundaries through hex shifts and surface layering rather than solid borders.
2. **Kinetic Interaction**: Use pill-shaped elements and glassmorphic panels to create a tactile, premium feel.
3. **Editorial Typography**: Use Inter with tight letter-spacing and strong hierarchy to mimic a design journal.
4. **Collaborative Clarity**: Real-time presence and feedback loops are integrated into the core layout.

## Design Tokens (Stitch System)

### 1. Color Palette
- **Core Background (Surface)**: `#060E20`
- **Primary Accent (Primary)**: `#A3A6FF` (Derived from vibrant Indigo `#6366F1`)
- **Secondary Accent (Tertiary)**: `#FFA5D9` (Used for active collaboration states)
- **Error/Alert**: `#FF6E84`

### 2. Surface Hierarchy
| Level | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Base** | `surface` | `#060E20` | Main application background |
| **Recessed** | `surface_container_lowest` | `#000000` | Canvas and deep focus areas |
| **Inset** | `surface_container_low` | `#091328` | Cards and list items |
| **Elevated** | `surface_container_high` | `#141F38` | Sidebars and panels |
| **Floating** | `surface_container_highest`| `#192540` | Modals and command bars |

### 3. Typography (Inter)
- **Headlines**: Authoritative, clean, tight tracking (-0.02em).
- **Body**: `1rem` (16px) standard. High contrast (`#DEE5FF`) for primary text, lower contrast (`#A3AAC4`) for metadata.

### 4. Shape & Spacing
- **Small (8px)**: Inputs, small chips.
- **Medium (16px)**: Standard cards, utility panels.
- **Large (32px)**: Main content containers.
- **Extra Large (48px)**: Sidebars and "Glass" panes.
- **Full (Pill)**: Buttons and presence indicators.

## Layout Structure
- **Navigation/Presence Header**: Top-aligned, showing online committee members and global sync status.
- **Central Preview Canvas**: A recessed area for the component being debated.
- **Committee Feed (Sidebar)**: Real-time activity feed showing votes, comments, and attribute changes.
- **Attribute Voting Widget**: Floating panel with interactive sliders for Color, Border Radius, and Font Size.

## Visual Effects
- **Glassmorphism**: 60% opacity with `24px` backdrop-blur for floating panels.
- **Kinetic Gradients**: 135° linear gradient from `primary_dim` (`#6063EE`) to `primary` (`#A3A6FF`) for primary CTAs.
- **Ambient Shadows**: Extra-diffused `rgba(0, 0, 0, 0.4)` with a subtle color bleed from the primary accent.
