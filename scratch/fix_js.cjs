const fs = require('fs');
const path = require('path');
const dir = 'frontend/views';
fs.readdirSync(dir).forEach(f => {
    if(f.endsWith('.html')){
        let p = path.join(dir,f);
        let c = fs.readFileSync(p,'utf8');
        c = c.replace(/main\.js\?v=2"/g, 'main.js?v=3"');
        c = c.replace(/main\.js"/g, 'main.js?v=3"');
        fs.writeFileSync(p,c);
    }
});
console.log('done');
