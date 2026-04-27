// This skill validates design changes against the rules in DESIGN.md

function validateDesign(update, context) {
  // Check 1: Luminous Obsidian "No pure black" rule except for recessed areas
  // For the sake of this mock, we enforce that primary color cannot be red/error unless justified
  
  if (update.primaryColor && update.primaryColor.toUpperCase() === '#FF6E84') {
    return {
      isValid: false,
      feedback: "Using the Error token (#FF6E84) as a Primary Color violates the Luminous Obsidian hierarchy. Are you sure you want to proceed?"
    };
  }

  // Check 2: Corner Radius extremes
  if (update.borderRadius !== undefined && update.borderRadius > 32) {
    return {
      isValid: false,
      feedback: "A border radius larger than 32px starts to conflict with the 'Pill' shape reserved for buttons. Consider scaling it down."
    };
  }

  return { isValid: true };
}

module.exports = { validateDesign };
