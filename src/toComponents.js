let filepath;
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const jsx = require('./jsx');
const toComponent= jsx.toComponent;
const ComponentRegexp = /React\.createElement\(\s*([A-Z]\w*)\s*,/g;

const tplExt = '.jsx';
let Components;
let context;

function initJsx(componentName, matter){
  Components[componentName] = {
    status: 0,
    depends: [],
    content: matter.content,
    data: matter.data
  };
  
  let jsCode = jsx.parse(jsx.wrap(matter.content));
  jsCode.replace(ComponentRegexp, (str, match)=>Components[componentName].depends.push(match))
}

function initComponents(){
  let rootFiles = fs.readdirSync(filepath);
  rootFiles.forEach(item=>{
    if(path.extname(item) !== tplExt) return;
    let componentName = path.basename(item, tplExt);
    
    let content = fs.readFileSync(path.resolve(filepath, item), 'utf8');
    initJsx(componentName, matter(content));
  })
}

function parseJsx(name){
  let component = Components[name];
  if(component.depends.length === 0){
    component.status = 1;
    component.fn = toComponent(component.content, context);
  }else{
    let sign = true, scope = Object.assign({}, context);
    component.depends.forEach(d=>{
      if(!Components[d])throw new Error(`Do not exist the component "${d}"`);
      if(Components[d].status === 0){
        sign = false;        
      }
      scope[d] = Components[d].fn;
    })
    if(sign) {
      component.status = 1;
      component.fn = toComponent(component.content, scope)
    }
  }
}

function checkCompents(){
  let sign = true;
  Object.keys(Components).forEach(componentName=>{
    if(Components[componentName].status === 0){
      sign = false;
    }
  })
  return sign;
}

function loadComponents(level){
  if(level > 1000) throw new Error('Recursion is over 1000.');
  level++;
  Object.keys(Components).forEach(componentName=>{
    if(Components[componentName].status === 0) parseJsx(componentName);
  })
  if(checkCompents() === false) loadComponents(level+1);
}

exports.toComponents = function(dir, _components, _context = {}){
  Components = _components;
  context = _context;
  filepath = dir;
  initComponents();
  loadComponents();
}

exports.addComponent = function(name, content, _components){
  Components = _components;
  initJsx(name, matter(content));
  parseJsx(name)
  return Components[name];
}