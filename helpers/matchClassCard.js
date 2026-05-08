const tokenize = (str) => (str || "")
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const scoreMatch = (searchTokens, cardTokens) => {
    const cardSet = new Set(cardTokens);
    let matched = 0;
    for (const t of searchTokens) {
        if (cardSet.has(t)) matched++;
    }
    if (matched === 0) return null;
    return { matched, extras: cardTokens.length - matched };
};

const findClassCard = async (allCards, { className, startTime }) => {
    const searchTokens = tokenize(className);
    if (searchTokens.length === 0) {
        throw new Error(`Empty search name: "${className}"`);
    }

    const count = await allCards.count();
    const candidates = [];

    for (let i = 0; i < count; i++) {
        const card = allCards.nth(i);
        const cardText = await card.innerText();

        if (!cardText.includes(startTime)) continue;

        const title = await card.locator('h2.title').first().textContent().then(t => (t || '').trim()).catch(() => '');
        const cardTokens = tokenize(title);
        const score = scoreMatch(searchTokens, cardTokens);

        if (score) {
            candidates.push({ card, title, ...score });
        } else {
            console.log(`Ignored match (Time ok, Name mismatch): "${title}"`);
        }
    }

    if (candidates.length === 0) {
        throw new Error(`Class not found (Name: "${className}", Time: "${startTime}")`);
    }

    candidates.sort((a, b) => b.matched - a.matched || a.extras - b.extras);
    const [best, runnerUp] = candidates;

    if (runnerUp && runnerUp.matched === best.matched && runnerUp.extras === best.extras) {
        const tied = candidates
            .filter(c => c.matched === best.matched && c.extras === best.extras)
            .map(c => `"${c.title}"`)
            .join(', ');
        throw new Error(`Ambiguous match for "${className}" at "${startTime}": ${tied}`);
    }

    console.log(`✅ Match found: "${best.title}" (matched ${best.matched}/${searchTokens.length}, extras ${best.extras})`);
    return { card: best.card, title: best.title };
};

module.exports = { tokenize, scoreMatch, findClassCard };
