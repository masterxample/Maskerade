const fs = require('fs');
let code = fs.readFileSync('src/data/cards.ts', 'utf-8');

code = code.replace(
  /import kanzler1 from '\.\.\/assets\/images\/kanzler_portrait_1787643222476\.jpg';\nimport kanzler2 from '\.\.\/assets\/images\/kanzler_merkel_1787643728049\.jpg';\nimport kanzler3 from '\.\.\/assets\/images\/kanzler_kohl_1787643741025\.jpg';/g,
  `import kanzler1 from '../assets/images/kanzler-card-1787590668383.jpg';\nimport kanzler2 from '../assets/images/kanzlerin-card-1787590845712.jpg';\nimport kanzler3 from '../assets/images/kanzler-elder-card-1787590920279.jpg';`
);

code = code.replace(
  /import strassenraeuber1 from '\.\.\/assets\/images\/strassenraeuber_portrait_1787643236872\.jpg';\nimport strassenraeuber2 from '\.\.\/assets\/images\/strassenraeuber_2_1787643759985\.jpg';\nimport strassenraeuber3 from '\.\.\/assets\/images\/strassenraeuber_3_1787643770978\.jpg';/g,
  `import strassenraeuber1 from '../assets/images/strassenraeuber-card-1787590685292.jpg';\nimport strassenraeuber2 from '../assets/images/strassenraeuberin-card-1787590859654.jpg';\nimport strassenraeuber3 from '../assets/images/strassenraeuber-mask-card-1787590935913.jpg';`
);

code = code.replace(
  /import spion1 from '\.\.\/assets\/images\/spion_portrait_1787643250494\.jpg';\nimport spion2 from '\.\.\/assets\/images\/spion_2_1787643782866\.jpg';\nimport spion3 from '\.\.\/assets\/images\/spion_3_1787643794093\.jpg';/g,
  `import spion1 from '../assets/images/spion-card-1787590697235.jpg';\nimport spion2 from '../assets/images/spionin-card-1787590874034.jpg';\nimport spion3 from '../assets/images/spion-analyst-card-1787590949296.jpg';`
);

code = code.replace(
  /import bodyguard1 from '\.\.\/assets\/images\/bodyguard_portrait_1787643262944\.jpg';\nimport bodyguard2 from '\.\.\/assets\/images\/bodyguard_2_1787643806443\.jpg';\nimport bodyguard3 from '\.\.\/assets\/images\/bodyguard_3_1787643824776\.jpg';/g,
  `import bodyguard1 from '../assets/images/bodyguard-card-1787590727979.jpg';\nimport bodyguard2 from '../assets/images/bodyguardin-card-1787590888013.jpg';\nimport bodyguard3 from '../assets/images/bodyguard-bald-card-1787590962433.jpg';`
);

code = code.replace(
  /import bluthund1 from '\.\.\/assets\/images\/bluthund_portrait_1787643275549\.jpg';\nimport bluthund2 from '\.\.\/assets\/images\/bluthund_2_1787643837274\.jpg';\nimport bluthund3 from '\.\.\/assets\/images\/bluthund_3_1787643847675\.jpg';/g,
  `import bluthund1 from '../assets/images/bluthund-card-1787590748832.jpg';\nimport bluthund2 from '../assets/images/bluthuendin-card-1787590901530.jpg';\nimport bluthund3 from '../assets/images/bluthund-fedora-card-1787590977371.jpg';`
);

code = code.replace(
  /import cardBackImg from '\.\.\/assets\/images\/card_back_maskerade_1787643290795\.jpg';/,
  `import cardBackImg from '../assets/images/card-back-1787590760719.jpg';`
);

fs.writeFileSync('src/data/cards.ts', code);
