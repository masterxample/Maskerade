const fs = require('fs');

let code = fs.readFileSync('src/data/cards.ts', 'utf-8');

code = code.replace(
  /import kanzler1 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport kanzler2 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport kanzler3 from '\.\.\/assets\/images\/[^']+\.jpg';/g,
  `import kanzler1 from '../assets/images/kanzler_card_1787590668383.jpg';\nimport kanzler2 from '../assets/images/kanzlerin_card_1787590845712.jpg';\nimport kanzler3 from '../assets/images/kanzler_elder_card_1787590920279.jpg';`
);

code = code.replace(
  /import strassenraeuber1 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport strassenraeuber2 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport strassenraeuber3 from '\.\.\/assets\/images\/[^']+\.jpg';/g,
  `import strassenraeuber1 from '../assets/images/strassenraeuber_card_1787590685292.jpg';\nimport strassenraeuber2 from '../assets/images/strassenraeuberin_card_1787590859654.jpg';\nimport strassenraeuber3 from '../assets/images/strassenraeuber_mask_card_1787590935913.jpg';`
);

code = code.replace(
  /import spion1 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport spion2 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport spion3 from '\.\.\/assets\/images\/[^']+\.jpg';/g,
  `import spion1 from '../assets/images/spion_card_1787590697235.jpg';\nimport spion2 from '../assets/images/spionin_card_1787590874034.jpg';\nimport spion3 from '../assets/images/spion_analyst_card_1787590949296.jpg';`
);

code = code.replace(
  /import bodyguard1 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport bodyguard2 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport bodyguard3 from '\.\.\/assets\/images\/[^']+\.jpg';/g,
  `import bodyguard1 from '../assets/images/bodyguard_card_1787590727979.jpg';\nimport bodyguard2 from '../assets/images/bodyguardin_card_1787590888013.jpg';\nimport bodyguard3 from '../assets/images/bodyguard_bald_card_1787590962433.jpg';`
);

code = code.replace(
  /import bluthund1 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport bluthund2 from '\.\.\/assets\/images\/[^']+\.jpg';\nimport bluthund3 from '\.\.\/assets\/images\/[^']+\.jpg';/g,
  `import bluthund1 from '../assets/images/bluthund_card_1787590748832.jpg';\nimport bluthund2 from '../assets/images/bluthuendin_card_1787590901530.jpg';\nimport bluthund3 from '../assets/images/bluthund_fedora_card_1787590977371.jpg';`
);

code = code.replace(
  /import cardBackImg from '\.\.\/assets\/images\/[^']+\.jpg';/,
  `import cardBackImg from '../assets/images/card_back_1787590760719.jpg';`
);

fs.writeFileSync('src/data/cards.ts', code);
