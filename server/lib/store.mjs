import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const makeId = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
export const now = () => new Date().toISOString();

const demoProjects = [
  {
    id: 'proj_atelier', name: 'Atelier — Brand website', client: 'Atelier Studio',
    category: 'Web design', status: 'active', budget: 2400, hourlyRate: 65, currency: 'USD',
    deadline: '2026-12-04',
    scope: 'Design and develop a responsive 5-page marketing website (Home, About, Services, Work, Contact), basic contact form, SEO metadata, and one round of revisions. No ecommerce, user accounts, booking systems, or custom dashboards.',
    createdAt: '2026-11-05T12:00:00.000Z'
  },
  {
    id: 'proj_northstar', name: 'Northstar — Mobile app', client: 'Northstar Labs',
    category: 'App development', status: 'active', budget: 4800, hourlyRate: 85, currency: 'USD',
    deadline: '2026-12-18',
    scope: 'Build a mobile-friendly prototype with user login, a profile page, a dashboard with three static graphs, and push notification mockups. Two rounds of visual feedback. Excludes payment integrations, production push services, and team accounts.',
    createdAt: '2026-11-03T10:00:00.000Z'
  },
  {
    id: 'proj_solace', name: 'Solace — Content refresh', client: 'Solace Wellness',
    category: 'Content & copy', status: 'active', budget: 920, hourlyRate: 55, currency: 'USD',
    deadline: '2026-11-28',
    scope: 'Rewrite 8 website pages and create 4 SEO blog posts up to 800 words each. Includes up to two revision rounds per deliverable. Excludes translation, additional pages, and video scripts.',
    createdAt: '2026-11-01T16:30:00.000Z'
  }
];

export const initialStore = () => ({schemaVersion:2, projects: demoProjects, analyses: [], changeOrders: [], negotiations:[], activities: [
  {id: 'act_welcome', type:'system', message:'Workspace created with three example projects', createdAt:'2026-11-10T09:00:00.000Z'}
]});

export class Store {
  constructor(file) {
    this.file = path.resolve(file);
    fs.mkdirSync(path.dirname(this.file), {recursive:true});
    if (!fs.existsSync(this.file)) this.write(initialStore());
    this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
  }
  write(data) {
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), {mode: 0o600});
    fs.renameSync(temp, this.file);
  }
  update(fn) {
    // A single Node.js process serializes synchronous state mutations.
    const result = fn(this.data);
    this.write(this.data);
    return result;
  }
  activity(type, message, projectId = null) {
    this.data.activities.unshift({id:makeId('act'),type,message,projectId,createdAt:now()});
    this.data.activities = this.data.activities.slice(0, 150);
  }
}

export function publicState(store) {
  return {
    projects: [...store.data.projects].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    analyses: [...store.data.analyses].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    changeOrders: [...store.data.changeOrders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    negotiations: [...(store.data.negotiations||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    activities: store.data.activities.slice(0,70)
  };
}
