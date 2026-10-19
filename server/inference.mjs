export function normalizeText(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[\p{White_Space}\u001c-\u001f]+/gu, ' ').replace(/^ +| +$/g, '');
}

export function classify(text, model) {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error('Please add a message first.');
  if ([...normalized].length > model.text_limit) throw new Error(`Use at most ${model.text_limit} characters.`);
  const vocabulary = new Set(model.vocabulary);
  const characters = [...normalized];
  const counts = new Map();
  let total = 0;
  let known = 0;
  for (let n = model.ngram_range[0]; n <= model.ngram_range[1]; n++) {
    for (let i = 0; i <= characters.length - n; i++) {
      const gram = characters.slice(i, i + n).join('');
      total++;
      if (vocabulary.has(gram)) {
        known++;
        counts.set(gram, (counts.get(gram) || 0) + 1);
      }
    }
  }
  const logScores = model.classes.map(label => {
    let score = model.priors[label];
    for (const [gram, count] of counts) score += count * (model.likelihoods[label][gram] ?? model.default_log_likelihood[label]);
    return { label, logScore: score };
  });
  const maximum = Math.max(...logScores.map(row => row.logScore));
  const denominator = logScores.reduce((sum, row) => sum + Math.exp(row.logScore - maximum), 0);
  const scores = logScores.map(row => ({ label: row.label, score: Math.exp(row.logScore - maximum) / denominator })).sort((a, b) => b.score - a.score);
  const coverage = total ? known / total : 0;
  const reasons = [];
  if (coverage < model.thresholds.min_coverage) reasons.push('Too few familiar character patterns.');
  if (scores[0].score < model.thresholds.min_top_posterior) reasons.push('The leading score is below the development threshold.');
  return { label: scores[0].label, scores, coverage, abstained: reasons.length > 0, reasons };
}
