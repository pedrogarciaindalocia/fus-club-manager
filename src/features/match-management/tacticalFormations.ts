// Single source of truth for tactical formations, reduced match formats (6v6 to 11v11),
// and pitch coordinate systems (both vertical and horizontal landscape).

export const FORMATIONS_BY_FORMAT: Record<number, string[]> = {
  6: ['2-2-1', '2-1-2', '3-1-1'],
  7: ['2-3-1', '3-2-1', '2-2-2'],
  8: ['3-3-1', '2-4-1', '3-2-2'],
  9: ['3-3-2', '3-4-1', '4-3-1', '3-2-3'],
  10: ['4-4-1', '4-3-2', '3-4-2', '3-3-3'],
  11: [
    '4-3-3',
    '4-3-3 (Offensif)',
    '4-3-3 (Défensif)',
    '4-3-3 (Faux 9)',
    '4-3-3 (À plat)',
    '4-4-2',
    '4-1-2-1-2',
    '4-2-3-1',
    '4-1-4-1',
    '3-5-2',
    '3-4-3',
    '5-3-2',
    '5-4-1',
    '5-2-3',
    '3-4-2-1',
    '3-4-1-2',
    '4-3-2-1',
    '4-5-1',
    '4-4-1-1',
    '4-2-2-2',
  ],
};

export const ALL_FORMATION_ROLES: Record<string, { top: string; left: string; label: string }[]> = {
  // ── 6 vs 6 (6 players) ──
  '2-2-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '70%', left: '30%', label: 'CB' }, { top: '70%', left: '70%', label: 'CB' },
    { top: '45%', left: '30%', label: 'CM' }, { top: '45%', left: '70%', label: 'CM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '2-1-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '70%', left: '30%', label: 'CB' }, { top: '70%', left: '70%', label: 'CB' },
    { top: '48%', left: '50%', label: 'CM' },
    { top: '20%', left: '32%', label: 'ST' }, { top: '20%', left: '68%', label: 'ST' },
  ],
  '3-1-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'CB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'CB' },
    { top: '46%', left: '50%', label: 'CM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],

  // ── 7 vs 7 (7 players) ──
  '2-3-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '30%', label: 'CB' }, { top: '72%', left: '70%', label: 'CB' },
    { top: '48%', left: '18%', label: 'LM' }, { top: '50%', left: '50%', label: 'CM' }, { top: '48%', left: '82%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '3-2-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'LB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'RB' },
    { top: '48%', left: '35%', label: 'CM' }, { top: '48%', left: '65%', label: 'CM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '2-2-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '30%', label: 'CB' }, { top: '72%', left: '70%', label: 'CB' },
    { top: '48%', left: '32%', label: 'CM' }, { top: '48%', left: '68%', label: 'CM' },
    { top: '20%', left: '35%', label: 'ST' }, { top: '20%', left: '65%', label: 'ST' },
  ],

  // ── 8 vs 8 (8 players) ──
  '3-3-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'LB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'RB' },
    { top: '48%', left: '18%', label: 'LM' }, { top: '50%', left: '50%', label: 'CM' }, { top: '48%', left: '82%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '2-4-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '32%', label: 'CB' }, { top: '72%', left: '68%', label: 'CB' },
    { top: '50%', left: '15%', label: 'LM' }, { top: '54%', left: '38%', label: 'CM' }, { top: '54%', left: '62%', label: 'CM' }, { top: '50%', left: '85%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '3-2-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'LB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'RB' },
    { top: '48%', left: '35%', label: 'CM' }, { top: '48%', left: '65%', label: 'CM' },
    { top: '20%', left: '35%', label: 'ST' }, { top: '20%', left: '65%', label: 'ST' },
  ],

  // ── 9 vs 9 (9 players) ──
  '3-3-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'LB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'RB' },
    { top: '50%', left: '20%', label: 'LM' }, { top: '54%', left: '50%', label: 'CM' }, { top: '50%', left: '80%', label: 'RM' },
    { top: '20%', left: '35%', label: 'ST' }, { top: '20%', left: '65%', label: 'ST' },
  ],
  '3-4-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '20%', label: 'LB' }, { top: '75%', left: '50%', label: 'CB' }, { top: '72%', left: '80%', label: 'RB' },
    { top: '50%', left: '15%', label: 'LM' }, { top: '52%', left: '38%', label: 'CM' }, { top: '52%', left: '62%', label: 'CM' }, { top: '50%', left: '85%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '4-3-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '48%', left: '25%', label: 'CM' }, { top: '54%', left: '50%', label: 'CDM' }, { top: '48%', left: '75%', label: 'CM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '3-2-3': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '22%', label: 'CB' }, { top: '76%', left: '50%', label: 'CB' }, { top: '74%', left: '78%', label: 'CB' },
    { top: '52%', left: '35%', label: 'CM' }, { top: '52%', left: '65%', label: 'CM' },
    { top: '22%', left: '20%', label: 'LW' }, { top: '16%', left: '50%', label: 'ST' }, { top: '22%', left: '80%', label: 'RW' },
  ],

  // ── 10 vs 10 (10 players) ──
  '4-4-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '48%', left: '15%', label: 'LM' }, { top: '52%', left: '38%', label: 'CM' }, { top: '52%', left: '62%', label: 'CM' }, { top: '48%', left: '85%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '4-3-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '50%', left: '25%', label: 'CM' }, { top: '56%', left: '50%', label: 'CDM' }, { top: '50%', left: '75%', label: 'CM' },
    { top: '18%', left: '38%', label: 'ST' }, { top: '18%', left: '62%', label: 'ST' },
  ],
  '3-4-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '22%', label: 'CB' }, { top: '76%', left: '50%', label: 'CB' }, { top: '74%', left: '78%', label: 'CB' },
    { top: '50%', left: '15%', label: 'LM' }, { top: '54%', left: '38%', label: 'CM' }, { top: '54%', left: '62%', label: 'CM' }, { top: '50%', left: '85%', label: 'RM' },
    { top: '18%', left: '38%', label: 'ST' }, { top: '18%', left: '62%', label: 'ST' },
  ],
  '3-3-3': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '22%', label: 'CB' }, { top: '76%', left: '50%', label: 'CB' }, { top: '74%', left: '78%', label: 'CB' },
    { top: '52%', left: '25%', label: 'CM' }, { top: '56%', left: '50%', label: 'CDM' }, { top: '52%', left: '75%', label: 'CM' },
    { top: '22%', left: '20%', label: 'LW' }, { top: '16%', left: '50%', label: 'ST' }, { top: '22%', left: '80%', label: 'RW' },
  ],

  // ── 11 vs 11 (11 players) ──
  '4-3-3': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '50%', left: '32%', label: 'CM' }, { top: '58%', left: '50%', label: 'CDM' }, { top: '50%', left: '68%', label: 'CM' },
    { top: '22%', left: '20%', label: 'LW' }, { top: '12%', left: '50%', label: 'ST' }, { top: '22%', left: '80%', label: 'RW' },
  ],
  '4-3-3 (Offensif)': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '54%', left: '34%', label: 'CM' }, { top: '54%', left: '66%', label: 'CM' },
    { top: '38%', left: '50%', label: 'CAM' },
    { top: '22%', left: '18%', label: 'LW' }, { top: '14%', left: '50%', label: 'ST' }, { top: '22%', left: '82%', label: 'RW' },
  ],
  '4-3-3 (Défensif)': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '62%', left: '36%', label: 'CDM' }, { top: '62%', left: '64%', label: 'CDM' },
    { top: '45%', left: '50%', label: 'CM' },
    { top: '22%', left: '20%', label: 'LW' }, { top: '14%', left: '50%', label: 'ST' }, { top: '22%', left: '80%', label: 'RW' },
  ],
  '4-3-3 (Faux 9)': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '50%', left: '32%', label: 'CM' }, { top: '58%', left: '50%', label: 'CDM' }, { top: '50%', left: '68%', label: 'CM' },
    { top: '18%', left: '22%', label: 'LW' }, { top: '28%', left: '50%', label: 'CF' }, { top: '18%', left: '78%', label: 'RW' },
  ],
  '4-3-3 (À plat)': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '50%', left: '26%', label: 'CM' }, { top: '50%', left: '50%', label: 'CM' }, { top: '50%', left: '74%', label: 'CM' },
    { top: '22%', left: '20%', label: 'LW' }, { top: '14%', left: '50%', label: 'ST' }, { top: '22%', left: '80%', label: 'RW' },
  ],
  '4-4-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '48%', left: '12%', label: 'LM' }, { top: '52%', left: '36%', label: 'CM' }, { top: '52%', left: '64%', label: 'CM' }, { top: '48%', left: '88%', label: 'RM' },
    { top: '18%', left: '38%', label: 'ST' }, { top: '18%', left: '62%', label: 'ST' },
  ],
  '4-1-2-1-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '62%', left: '50%', label: 'CDM' },
    { top: '48%', left: '30%', label: 'CM' }, { top: '48%', left: '70%', label: 'CM' },
    { top: '34%', left: '50%', label: 'CAM' },
    { top: '16%', left: '38%', label: 'ST' }, { top: '16%', left: '62%', label: 'ST' },
  ],
  '4-2-3-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '60%', left: '36%', label: 'CDM' }, { top: '60%', left: '64%', label: 'CDM' },
    { top: '40%', left: '20%', label: 'LAM' }, { top: '34%', left: '50%', label: 'CAM' }, { top: '40%', left: '80%', label: 'RAM' },
    { top: '12%', left: '50%', label: 'ST' },
  ],
  '4-1-4-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '62%', left: '50%', label: 'CDM' },
    { top: '42%', left: '12%', label: 'LM' }, { top: '45%', left: '34%', label: 'CM' }, { top: '45%', left: '66%', label: 'CM' }, { top: '42%', left: '88%', label: 'RM' },
    { top: '12%', left: '50%', label: 'ST' },
  ],
  '3-5-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '28%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '74%', left: '72%', label: 'CB' },
    { top: '50%', left: '12%', label: 'LM' }, { top: '54%', left: '34%', label: 'CM' }, { top: '60%', left: '50%', label: 'CDM' }, { top: '54%', left: '66%', label: 'CM' }, { top: '50%', left: '88%', label: 'RM' },
    { top: '18%', left: '38%', label: 'ST' }, { top: '18%', left: '62%', label: 'ST' },
  ],
  '3-4-3': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '28%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '74%', left: '72%', label: 'CB' },
    { top: '52%', left: '12%', label: 'LM' }, { top: '56%', left: '36%', label: 'CM' }, { top: '56%', left: '64%', label: 'CM' }, { top: '52%', left: '88%', label: 'RM' },
    { top: '25%', left: '18%', label: 'LW' }, { top: '12%', left: '50%', label: 'ST' }, { top: '25%', left: '82%', label: 'RW' },
  ],
  '5-3-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '12%', label: 'LWB' }, { top: '75%', left: '30%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '75%', left: '70%', label: 'CB' }, { top: '72%', left: '88%', label: 'RWB' },
    { top: '52%', left: '32%', label: 'CM' }, { top: '56%', left: '50%', label: 'CM' }, { top: '52%', left: '68%', label: 'CM' },
    { top: '18%', left: '38%', label: 'ST' }, { top: '18%', left: '62%', label: 'ST' },
  ],
  '5-4-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '10%', label: 'LWB' }, { top: '75%', left: '28%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '75%', left: '72%', label: 'CB' }, { top: '72%', left: '90%', label: 'RWB' },
    { top: '48%', left: '14%', label: 'LM' }, { top: '52%', left: '36%', label: 'CM' }, { top: '52%', left: '64%', label: 'CM' }, { top: '48%', left: '86%', label: 'RM' },
    { top: '18%', left: '50%', label: 'ST' },
  ],
  '5-2-3': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '12%', label: 'LWB' }, { top: '76%', left: '30%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '76%', left: '70%', label: 'CB' }, { top: '72%', left: '88%', label: 'RWB' },
    { top: '52%', left: '38%', label: 'CM' }, { top: '52%', left: '62%', label: 'CM' },
    { top: '24%', left: '20%', label: 'LW' }, { top: '14%', left: '50%', label: 'ST' }, { top: '24%', left: '80%', label: 'RW' },
  ],
  '3-4-2-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '25%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '74%', left: '75%', label: 'CB' },
    { top: '52%', left: '12%', label: 'LM' }, { top: '56%', left: '36%', label: 'CM' }, { top: '56%', left: '64%', label: 'CM' }, { top: '52%', left: '88%', label: 'RM' },
    { top: '35%', left: '32%', label: 'CAM' }, { top: '35%', left: '68%', label: 'CAM' },
    { top: '16%', left: '50%', label: 'ST' },
  ],
  '3-4-1-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '74%', left: '25%', label: 'CB' }, { top: '78%', left: '50%', label: 'CB' }, { top: '74%', left: '75%', label: 'CB' },
    { top: '52%', left: '12%', label: 'LM' }, { top: '56%', left: '36%', label: 'CM' }, { top: '56%', left: '64%', label: 'CM' }, { top: '52%', left: '88%', label: 'RM' },
    { top: '34%', left: '50%', label: 'CAM' },
    { top: '16%', left: '38%', label: 'ST' }, { top: '16%', left: '62%', label: 'ST' },
  ],
  '4-3-2-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '54%', left: '25%', label: 'CM' }, { top: '58%', left: '50%', label: 'CM' }, { top: '54%', left: '75%', label: 'CM' },
    { top: '36%', left: '35%', label: 'CAM' }, { top: '36%', left: '65%', label: 'CAM' },
    { top: '16%', left: '50%', label: 'ST' },
  ],
  '4-5-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '46%', left: '10%', label: 'LM' }, { top: '50%', left: '28%', label: 'CM' }, { top: '54%', left: '50%', label: 'CDM' }, { top: '50%', left: '72%', label: 'CM' }, { top: '46%', left: '90%', label: 'RM' },
    { top: '16%', left: '50%', label: 'ST' },
  ],
  '4-4-1-1': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '50%', left: '12%', label: 'LM' }, { top: '54%', left: '36%', label: 'CM' }, { top: '54%', left: '64%', label: 'CM' }, { top: '50%', left: '88%', label: 'RM' },
    { top: '34%', left: '50%', label: 'CAM' },
    { top: '16%', left: '50%', label: 'ST' },
  ],
  '4-2-2-2': [
    { top: '90%', left: '50%', label: 'GK' },
    { top: '72%', left: '15%', label: 'LB' }, { top: '76%', left: '36%', label: 'CB' }, { top: '76%', left: '64%', label: 'CB' }, { top: '72%', left: '85%', label: 'RB' },
    { top: '60%', left: '36%', label: 'CDM' }, { top: '60%', left: '64%', label: 'CDM' },
    { top: '38%', left: '26%', label: 'CAM' }, { top: '38%', left: '74%', label: 'CAM' },
    { top: '16%', left: '38%', label: 'ST' }, { top: '16%', left: '62%', label: 'ST' },
  ],
};

/**
 * Returns vertical tactical pitch coordinates (top, left, label).
 * Used for top-to-bottom pitches like MatchOverviewPanel and ScheduleMatchWizard.
 */
export const getFormationPositions = (
  formation?: string | null,
  format: number = 11
): { top: string; left: string; label: string }[] => {
  if (formation && ALL_FORMATION_ROLES[formation]) {
    return ALL_FORMATION_ROLES[formation];
  }
  const defaultFormation = FORMATIONS_BY_FORMAT[format]?.[0] || '4-3-3';
  return ALL_FORMATION_ROLES[defaultFormation] || ALL_FORMATION_ROLES['4-3-3'];
};

export interface HorizontalPosition {
  left?: string;
  right?: string;
  top: string;
  label: string;
}

/**
 * Calculates horizontal coordinates for landscape pitch (16:10), like in MatchStatsView.
 * Home team plays left-to-right (left: 8%..44%).
 * Away team plays right-to-left (right: 8%..44%).
 */
export const getHorizontalFormationPositions = (
  formationStr?: string | null,
  format: number = 11,
  team: 'home' | 'away' = 'home'
): HorizontalPosition[] => {
  const normFormation = (formationStr && ALL_FORMATION_ROLES[formationStr])
    ? formationStr
    : (FORMATIONS_BY_FORMAT[format]?.[0] || '4-3-3');

  // Parse lines: e.g. "2-2-1" -> [2, 2, 1]
  const lineCounts = normFormation
    .split('-')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);

  // If parsing fails, use standard fallback
  if (lineCounts.length === 0) {
    lineCounts.push(format - 1);
  }

  const positions: HorizontalPosition[] = [];

  // GK is always first
  if (team === 'home') {
    positions.push({ left: '8%', top: '50%', label: 'GK' });
  } else {
    positions.push({ right: '8%', top: '50%', label: 'GK' });
  }

  const numLines = lineCounts.length;

  lineCounts.forEach((count, lineIdx) => {
    // Determine depth (% from left or right)
    // Defense: ~18%, Attack: ~44%
    const depthPct = numLines === 1
      ? 28
      : 18 + Math.round((lineIdx / (numLines - 1)) * 26);

    // Determine vertical spread for 'count' players on this line
    const tops: string[] = [];
    if (count === 1) {
      tops.push('50%');
    } else if (count === 2) {
      tops.push('32%', '68%');
    } else if (count === 3) {
      tops.push('22%', '50%', '78%');
    } else if (count === 4) {
      tops.push('16%', '38%', '62%', '84%');
    } else if (count === 5) {
      tops.push('12%', '30%', '50%', '70%', '88%');
    } else {
      for (let j = 0; j < count; j++) {
        const pct = 15 + Math.round((j / (count - 1)) * 70);
        tops.push(`${pct}%`);
      }
    }

    // Role labels roughly determined by line index
    let defaultLabel = 'MF';
    if (lineIdx === 0) defaultLabel = 'DF';
    else if (lineIdx === numLines - 1) defaultLabel = 'FW';

    tops.forEach(topVal => {
      if (team === 'home') {
        positions.push({ left: `${depthPct}%`, top: topVal, label: defaultLabel });
      } else {
        positions.push({ right: `${depthPct}%`, top: topVal, label: defaultLabel });
      }
    });
  });

  return positions;
};

/**
 * Intelligent helper that extracts or infers the match format (e.g. 6 for 6v6, 8 for 8v8, 11 for 11v11)
 * from whatever metadata is present in the match object.
 */
export const inferMatchFormat = (match: any): number => {
  if (!match) return 11;

  const rawLineup = match.lineup as any;

  // 1. Explicit match_format property
  if (rawLineup?.match_format && Number(rawLineup.match_format) >= 5 && Number(rawLineup.match_format) <= 11) {
    return Number(rawLineup.match_format);
  }
  if (match.match_format && Number(match.match_format) >= 5 && Number(match.match_format) <= 11) {
    return Number(match.match_format);
  }

  // 2. Try to infer from notes: e.g. "(6v6)", "6v6", or "(8v8)"
  const notesMatch = String(match.notes || '').match(/(\d+)v\1/);
  if (notesMatch) {
    const parsed = parseInt(notesMatch[1], 10);
    if (parsed >= 5 && parsed <= 11) return parsed;
  }

  // 3. Try to infer from formation string: e.g. "2-2-1" -> 2+2+1 + 1 GK = 6
  const formationCandidate = match.formation || rawLineup?.formation || match.opponent_formation || '';
  if (formationCandidate && formationCandidate.includes('-')) {
    const cleanCandidate = formationCandidate.replace(/\(.*?\)/g, '').trim();
    const parts = cleanCandidate.split('-').map((n: string) => parseInt(n.trim(), 10));
    if (parts.length >= 2 && parts.every((n: number) => !isNaN(n) && n > 0)) {
      const sum = parts.reduce((a: number, b: number) => a + b, 0) + 1; // + 1 GK
      if (sum >= 5 && sum <= 11) return sum;
    }
  }

  // 4. Try to infer from startingXI length if already defined and < 11
  const rawStarting = match.starting_eleven || rawLineup?.startingXI;
  if (Array.isArray(rawStarting)) {
    const validCount = rawStarting.filter((id: any) => id && String(id).trim() !== '').length;
    if (validCount >= 5 && validCount < 11) return validCount;
    if (rawStarting.length >= 5 && rawStarting.length < 11) return rawStarting.length;
  }

  // 5. Default by youth category if friendly or scrimmage
  const cat = String(match.category || '').toUpperCase().trim();
  if (['U7', 'U8', 'U9'].includes(cat)) return 6;
  if (['U10', 'U11'].includes(cat)) return 7;
  if (['U12', 'U13'].includes(cat)) return 8;

  return 11;
};
