const fs = require('fs');
const path = require('path');
const dir = 'frontend/views';
fs.readdirSync(dir).forEach(f => {
    if(f.endsWith('.html')){
        let p = path.join(dir,f);
        let c = fs.readFileSync(p,'utf8');
        c = c.replace(/\.css"/g, '.css?v=2"');
        c = c.replace(/\.css\?v=2\?v=2"/g, '.css?v=2"');
        fs.writeFileSync(p,c);
    }
});
console.log('done');
