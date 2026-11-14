const fs = require('node:fs');
class Reporter {
  constructor() { this.results = []; this.errors = []; }
  onTestEnd(test, result) {
    this.results.push({ title: test.title, status: result.status, durationMs: result.duration, errors: result.errors.map(e => ({ message: e.message || e.value || 'Erro', stack: e.stack, matcher: !!e.matcherResult })) });
  }
  onError(error) { this.errors.push(error.message || error.value || 'Erro operacional'); }
  onEnd(result) { fs.writeFileSync(process.env.TESTPILOT_RESULT, JSON.stringify({ status: result.status, results: this.results, errors: this.errors }, null, 2)); }
}
module.exports = Reporter;
