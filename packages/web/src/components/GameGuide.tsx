import { useT } from '../i18n';

export default function GameGuide() {
  const t = useT();

  return (
    <div className="guide-page">
      <a href="#/" className="guide-back-btn">{t('guide.back')}</a>
      <h1>{t('guide.title')}</h1>

      <h2>What is Tractor?</h2>
      <p>
        Tractor is a popular Chinese trick-taking card game played with <strong>two standard decks</strong> (108 cards including 4 jokers).
        It's played by <strong>4 or 6 players</strong> sitting in two teams. The goal is to advance your team's level from 2 all the way
        through Ace by winning rounds.
      </p>

      <h2>Teams and Seating</h2>
      <p>Players sit in alternating team positions around the table:</p>
      <ul>
        <li><strong>4 players</strong>: seats 1 &amp; 3 vs seats 2 &amp; 4</li>
        <li><strong>6 players</strong>: seats 1, 3 &amp; 5 vs seats 2, 4 &amp; 6</li>
      </ul>
      <p>Your teammates sit across from you, not next to you.</p>

      <h2>Levels and Progression</h2>
      <p>Each team starts at level <strong>2</strong> and tries to reach level <strong>Ace</strong>. The progression is:</p>
      <p><strong>2 &rarr; 3 &rarr; 4 &rarr; 5 &rarr; 6 &rarr; 7 &rarr; 8 &rarr; 9 &rarr; 10 &rarr; J &rarr; Q &rarr; K &rarr; A</strong></p>
      <p>
        Your current level determines your <strong>level rank</strong> &mdash; the rank that becomes special trump cards for the round.
        If your team is on level 5, all 5s are trump cards.
      </p>

      <h2>The Banker</h2>
      <p>
        One player is the <strong>banker</strong> each round. The banker's team is defending &mdash; they want to prevent the other team
        from scoring points. The non-banker team are the <strong>attackers</strong> trying to collect points.
      </p>

      <h2>Card Points</h2>
      <p>Only three ranks are worth points:</p>
      <ul>
        <li><strong>5</strong> &rarr; 5 points</li>
        <li><strong>10</strong> &rarr; 10 points</li>
        <li><strong>K</strong> &rarr; 10 points</li>
      </ul>
      <p>All other cards are worth 0 points. Your team collects points by winning tricks that contain point cards.</p>

      <h2>Trump Cards</h2>
      <p>Each round has a <strong>trump suit</strong> that beats all other suits. Trump cards (from strongest to weakest):</p>
      <ol>
        <li><strong>Big Joker</strong> (strongest card in the game)</li>
        <li><strong>Small Joker</strong></li>
        <li>Level-rank cards of the trump suit</li>
        <li>Level-rank cards of other suits</li>
        <li>Other cards of the trump suit</li>
      </ol>

      <h3>Selecting Trump</h3>
      <p>
        During dealing, players can <strong>declare</strong> a level-rank card to propose a trump suit. Other players can
        <strong> override</strong> with a stronger combination (pair beats single, joker pairs beat all).
      </p>

      <h2>The Kitty</h2>
      <p>
        After dealing, a few cards are set aside as the <strong>kitty</strong>. The banker sees the kitty, adds it to their hand,
        and then <strong>buries</strong> the same number of cards face-down. These matter at end of round.
      </p>

      <h2>Playing Tricks</h2>
      <h3>Leading a Trick</h3>
      <p>The trick leader can play:</p>
      <ul>
        <li><strong>Single</strong>: one card</li>
        <li><strong>Pair</strong>: two identical cards</li>
        <li><strong>Tractor</strong>: two or more consecutive pairs (e.g., pair of 7s + pair of 8s)</li>
        <li><strong>Throw</strong>: multiple singles/pairs of the same suit (risky &mdash; can be punished!)</li>
      </ul>

      <h3>Following a Trick</h3>
      <ul>
        <li>You must play cards of the led suit if you have them</li>
        <li>If a pair was led and you have a pair in that suit, you must play it</li>
        <li>If you're out of that suit, you may play trump to win or discard anything</li>
      </ul>

      <h2>Scoring a Round</h2>
      <p>At the end of all tricks, the attackers' points determine the outcome:</p>
      <ul>
        <li><strong>&lt; 80 points</strong>: Banker's team levels up</li>
        <li><strong>80&ndash;119</strong>: Attackers level up by 1</li>
        <li><strong>120&ndash;159</strong>: Attackers level up by 2</li>
        <li><strong>160+</strong>: Attackers level up by 3</li>
      </ul>
      <p>
        <strong>Kitty bonus:</strong> If the attackers win the last trick, kitty points are multiplied (2x for single lead, 4x for pair/tractor lead).
      </p>

      <h2>Tips for New Players</h2>
      <ul>
        <li><strong>Protect your point cards</strong> &mdash; 10s and Ks are valuable. Don't throw them away on tricks you'll lose.</li>
        <li><strong>Trump is powerful</strong> &mdash; use trump cards strategically to win tricks with lots of points.</li>
        <li><strong>Watch the kitty</strong> &mdash; if your team can win the last trick, those kitty points get multiplied.</li>
        <li><strong>Coordinate with teammates</strong> &mdash; feed them point cards when they're winning, avoid competing.</li>
      </ul>
    </div>
  );
}
