const { tokenize, scoreMatch } = require('./matchClassCard');

describe('tokenize', () => {
    test('lowercases and splits on whitespace', () => {
        expect(tokenize('Les Mills Body Pump')).toEqual(['les', 'mills', 'body', 'pump']);
    });

    test('treats concatenated words as one token', () => {
        expect(tokenize('LES MILLS BODYPUMP')).toEqual(['les', 'mills', 'bodypump']);
    });

    test('splits on punctuation and dashes', () => {
        expect(tokenize('Old-Skool Circuits')).toEqual(['old', 'skool', 'circuits']);
    });

    test('keeps digits inside tokens', () => {
        expect(tokenize('R1DE')).toEqual(['r1de']);
    });

    test('splits on lowercase-to-uppercase boundary (camelCase)', () => {
        expect(tokenize('BodyPump')).toEqual(['body', 'pump']);
        expect(tokenize('OldSkool')).toEqual(['old', 'skool']);
        expect(tokenize('Les Mills BodyPump')).toEqual(['les', 'mills', 'body', 'pump']);
    });

    test('does NOT split inside all-caps runs', () => {
        expect(tokenize('LES MILLS BODYPUMP')).toEqual(['les', 'mills', 'bodypump']);
        expect(tokenize('HIIT')).toEqual(['hiit']);
        expect(tokenize('KIA KARATE BRISTOL')).toEqual(['kia', 'karate', 'bristol']);
    });

    test('does not split digit-to-uppercase (e.g. R1DE stays one token)', () => {
        expect(tokenize('R1DE')).toEqual(['r1de']);
    });

    test('handles empty and nullish input', () => {
        expect(tokenize('')).toEqual([]);
        expect(tokenize(null)).toEqual([]);
        expect(tokenize(undefined)).toEqual([]);
    });

    test('drops empty tokens from leading/trailing/repeated separators', () => {
        expect(tokenize('   Hatha   Yoga   ')).toEqual(['hatha', 'yoga']);
    });
});

describe('scoreMatch', () => {
    test('returns null when no search token is in card tokens', () => {
        expect(scoreMatch(['hatha', 'yoga'], ['vinyasa', 'flow'])).toBeNull();
    });

    test('counts matched tokens and extras', () => {
        // search "Les Mills Body Pump" against card "LES MILLS BODYPUMP"
        const result = scoreMatch(
            ['les', 'mills', 'body', 'pump'],
            ['les', 'mills', 'bodypump']
        );
        expect(result).toEqual({ matched: 2, extras: 1 });
    });

    test('camelCase title (Les Mills BodyPump) becomes a perfect match for spaced search', () => {
        // search "Les Mills Body Pump" against card "Les Mills BodyPump"
        // (read via textContent so the d→P boundary is preserved)
        const result = scoreMatch(
            tokenize('Les Mills Body Pump'),
            tokenize('Les Mills BodyPump')
        );
        expect(result).toEqual({ matched: 4, extras: 0 });
    });

    test('handles full match with no extras', () => {
        expect(scoreMatch(['spin', 'class'], ['spin', 'class']))
            .toEqual({ matched: 2, extras: 0 });
    });

    test('handles partial match with extras (renamed class)', () => {
        // "Hatha Yoga" against "Hatha Vinyasa Yoga"
        expect(scoreMatch(['hatha', 'yoga'], ['hatha', 'vinyasa', 'yoga']))
            .toEqual({ matched: 2, extras: 1 });
    });

    test('matches a single overlapping token', () => {
        expect(scoreMatch(['hatha', 'yoga'], ['power', 'yoga']))
            .toEqual({ matched: 1, extras: 1 });
    });

    test('ranking: more matches beats fewer (sort behavior check)', () => {
        const a = scoreMatch(['spin', 'class'], ['spin', 'class']);
        const b = scoreMatch(['spin', 'class'], ['kia', 'karate', 'class']);
        // a should rank higher: more matched, fewer extras
        expect(a.matched).toBeGreaterThan(b.matched);
    });

    test('ranking: tie on matches, fewer extras wins', () => {
        const a = scoreMatch(['spin'], ['spin', 'class']);
        const b = scoreMatch(['spin'], ['power', 'spin', 'express']);
        expect(a.matched).toBe(b.matched);
        expect(a.extras).toBeLessThan(b.extras);
    });
});
