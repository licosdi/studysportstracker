// ==================== FOOTBALL SCORING ENGINE ====================
// Modular scoring system for football training sessions.
// Easily extensible for intensity tracking, fatigue scores, etc.

const FootballScoring = (() => {

  // ---- SCORING RULES ----
  // Each session type maps to point contributions per attribute.
  // Combined sessions (Team Training, Match, Physio) are derived composites.
  let SCORING_RULES = {
    'Technique':    { Technique: 2 },
    'Endurance':    { Endurance: 2 },
    'Strength':     { Strength: 2 },
    'Tactic':       { Tactic: 1 },
    'Recovery':     { Recovery: 1 },
    'Team Training':{ Technique: 2, Endurance: 2, Tactic: 1 },
    'Match':        { Technique: 2, Endurance: 2, Tactic: 1 },
    'Physio':       { Strength: 1, Recovery: 2 },
  };

  // ---- MINIMUM WEEKLY TARGETS ----
  let WEEKLY_TARGETS = {
    Technique: 18,
    Endurance: 12,
    Strength:  4,
    Tactic:    5,
    Recovery:  6,
  };

  // ---- ATTRIBUTE DISPLAY CONFIG ----
  const ATTRIBUTE_CONFIG = {
    Technique: { color: '#3b82f6', icon: '⚽' },
    Endurance: { color: '#f97316', icon: '🏃' },
    Strength:  { color: '#ef4444', icon: '💪' },
    Tactic:    { color: '#8b5cf6', icon: '🧠' },
    Recovery:  { color: '#10b981', icon: '🛌' },
  };

  // ---- SUGGESTION MAP ----
  // When an attribute is below target, suggest the best session type to add.
  const SUGGESTIONS = {
    Technique: 'Technique session',
    Endurance: 'Endurance session',
    Strength:  'Strength session',
    Tactic:    'Tactic session or Team Training',
    Recovery:  'Recovery session or Physio',
  };

  // ---- CORE CALCULATION ----

  /**
   * Calculate weekly attribute totals from a list of completed plan items.
   * Each item must have: { categoryName, isCompleted }
   * Only completed items are scored.
   */
  function calculateTotals(items) {
    const totals = { Technique: 0, Endurance: 0, Strength: 0, Tactic: 0, Recovery: 0 };
    const sessionCounts = {};

    for (const item of items) {
      if (!item.isCompleted) continue;

      const rule = SCORING_RULES[item.categoryName];
      if (!rule) continue;

      // Accumulate points per attribute
      for (const [attr, pts] of Object.entries(rule)) {
        if (attr in totals) totals[attr] += pts;
      }

      // Count sessions per type (combined counts as 1 session)
      sessionCounts[item.categoryName] = (sessionCounts[item.categoryName] || 0) + 1;
    }

    return { totals, sessionCounts };
  }

  /**
   * Calculate combined session totals for display groupings.
   * Returns: { teamTrainingAndMatch: N, ... }
   */
  function calculateSessionGroupTotals(sessionCounts) {
    return {
      teamTrainingAndMatch: (sessionCounts['Team Training'] || 0) + (sessionCounts['Match'] || 0),
    };
  }

  /**
   * Produce warnings for any attribute below its weekly target.
   * Returns array of { attribute, current, target, shortfall, suggestion }
   */
  function generateWarnings(totals) {
    const warnings = [];
    for (const [attr, target] of Object.entries(WEEKLY_TARGETS)) {
      const current = totals[attr] || 0;
      if (current < target) {
        warnings.push({
          attribute: attr,
          current,
          target,
          shortfall: target - current,
          suggestion: SUGGESTIONS[attr],
        });
      }
    }
    return warnings;
  }

  // ---- RULE EDITING ----

  function getScoringRules() {
    return JSON.parse(JSON.stringify(SCORING_RULES));
  }

  function updateScoringRule(sessionType, newRule) {
    SCORING_RULES[sessionType] = { ...newRule };
  }

  function getWeeklyTargets() {
    return { ...WEEKLY_TARGETS };
  }

  function updateWeeklyTarget(attribute, value) {
    if (attribute in WEEKLY_TARGETS) {
      WEEKLY_TARGETS[attribute] = Number(value);
    }
  }

  // ---- RENDERING ----

  /**
   * Render the full scoring dashboard into a container element.
   * container: DOM element
   * items: array of weekly plan items (with isCompleted, categoryName)
   */
  function renderScoringDashboard(container, items) {
    const { totals, sessionCounts } = calculateTotals(items);
    const groupTotals = calculateSessionGroupTotals(sessionCounts);
    const warnings = generateWarnings(totals);

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    container.innerHTML = `
      <div class="scoring-dashboard">

        <!-- Header row -->
        <div class="scoring-header">
          <div class="scoring-title-block">
            <h3 class="scoring-title">Weekly Scoring</h3>
            <span class="scoring-grand-total">${grandTotal} pts total</span>
          </div>
          <button class="btn btn-ghost btn-sm" id="scoring-edit-rules-btn">Edit Rules</button>
        </div>

        <!-- Attribute totals grid -->
        <div class="scoring-totals-grid">
          ${Object.entries(ATTRIBUTE_CONFIG).map(([attr, cfg]) => {
            const current = totals[attr] || 0;
            const target = WEEKLY_TARGETS[attr];
            const pct = Math.min(100, Math.round((current / target) * 100));
            const met = current >= target;
            return `
              <div class="scoring-attr-card ${met ? 'met' : 'unmet'}">
                <div class="scoring-attr-header">
                  <span class="scoring-attr-icon">${cfg.icon}</span>
                  <span class="scoring-attr-name">${attr}</span>
                  <span class="scoring-attr-badge" style="background:${cfg.color}">${current}/${target}</span>
                </div>
                <div class="scoring-progress-bar">
                  <div class="scoring-progress-fill" style="width:${pct}%;background:${cfg.color}"></div>
                </div>
                <div class="scoring-attr-meta">${pct}% of target</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Session group summary -->
        <div class="scoring-session-summary">
          <h4 class="scoring-section-label">Session Counts (completed)</h4>
          <div class="scoring-session-chips">
            <span class="session-chip team-match">Team Training + Match: ${groupTotals.teamTrainingAndMatch}</span>
            ${Object.entries(sessionCounts).map(([type, count]) =>
              `<span class="session-chip">${type}: ${count}</span>`
            ).join('')}
          </div>
        </div>

        <!-- Warnings -->
        <div class="scoring-warnings" id="scoring-warnings">
          ${warnings.length === 0
            ? `<div class="scoring-all-met"><span class="scoring-check">✓</span> All weekly targets met!</div>`
            : `<h4 class="scoring-section-label scoring-warn-label">Targets Below Minimum</h4>
               <ul class="scoring-warnings-list">
                 ${warnings.map(w => `
                   <li class="scoring-warning-item">
                     <span class="warn-icon">⚠</span>
                     <span class="warn-attr">${w.attribute}</span>
                     <span class="warn-val">${w.current}/${w.target} pts</span>
                     <span class="warn-shortfall">(${w.shortfall} short)</span>
                     <span class="warn-suggestion">→ Add: ${w.suggestion}</span>
                   </li>
                 `).join('')}
               </ul>`
          }
        </div>

        <!-- Editable rules panel (hidden by default) -->
        <div class="scoring-rules-panel" id="scoring-rules-panel" style="display:none;">
          <h4 class="scoring-section-label">Scoring Rules</h4>
          <div class="scoring-rules-table-wrapper">
            <table class="scoring-rules-table">
              <thead>
                <tr>
                  <th>Session Type</th>
                  <th>Technique</th>
                  <th>Endurance</th>
                  <th>Strength</th>
                  <th>Tactic</th>
                  <th>Recovery</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(SCORING_RULES).map(([type, rule]) => `
                  <tr data-session-type="${type}">
                    <td class="rule-session-name">${type}</td>
                    ${['Technique','Endurance','Strength','Tactic','Recovery'].map(attr => `
                      <td>
                        <input type="number" min="0" max="10" value="${rule[attr] || 0}"
                          class="rule-input"
                          data-session="${type}" data-attr="${attr}">
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <h4 class="scoring-section-label" style="margin-top:1rem;">Weekly Targets</h4>
          <div class="scoring-targets-edit">
            ${Object.entries(WEEKLY_TARGETS).map(([attr, val]) => `
              <div class="target-edit-row">
                <label>${attr}</label>
                <input type="number" min="0" value="${val}" class="target-input" data-attr="${attr}">
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    // Toggle rules panel
    container.querySelector('#scoring-edit-rules-btn').addEventListener('click', () => {
      const panel = container.querySelector('#scoring-rules-panel');
      const btn = container.querySelector('#scoring-edit-rules-btn');
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? 'Hide Rules' : 'Edit Rules';
    });

    // Live-update scoring rules on input change
    container.querySelectorAll('.rule-input').forEach(input => {
      input.addEventListener('change', () => {
        const sessionType = input.dataset.session;
        const attr = input.dataset.attr;
        const val = parseInt(input.value) || 0;
        if (!SCORING_RULES[sessionType]) SCORING_RULES[sessionType] = {};
        SCORING_RULES[sessionType][attr] = val;
        // Re-render with same items
        renderScoringDashboard(container, items);
      });
    });

    // Live-update weekly targets on input change
    container.querySelectorAll('.target-input').forEach(input => {
      input.addEventListener('change', () => {
        updateWeeklyTarget(input.dataset.attr, input.value);
        renderScoringDashboard(container, items);
      });
    });
  }

  // Public API
  return {
    calculateTotals,
    generateWarnings,
    renderScoringDashboard,
    getScoringRules,
    updateScoringRule,
    getWeeklyTargets,
    updateWeeklyTarget,
  };

})();
