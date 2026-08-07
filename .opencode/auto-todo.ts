#!/usr/bin/env node
// auto-todo.ts
// This script reads docs/gaming-project-progress.md, extracts unfinished tasks, and writes them to the todowrite CLI.

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

type Todo = {
  content: string;
  status: 'pending';
  priority: 'medium';
};

const DOCS_FILE = path.join('docs', 'gaming-project-progress.md');

async function main() {
  console.log('Reading', DOCS_FILE);
  let data: string;
  try {
    data = await fs.readFile(DOCS_FILE, 'utf8');
  } catch (err) {
    console.error(`Failed to read ${DOCS_FILE}:`, err);
    return;
  }

  const lines = data.split(/\r?\n/);
  const todos: Todo[] = [];
  for (const line of lines) {
    if (line.trim().startsWith('- [ ]')) {
      const content = line.trim().replace(/^- \[ \]\s*/, '').trim();
      todos.push({ content, status: 'pending', priority: 'medium' });
    }
  }

  if (todos.length === 0) {
    console.log('No pending todos found.');
    return;
  }

   console.log(`Found ${todos.length} todo(s). Updating local todowrite data.`);

   const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir();
   const dataDir = path.join(homeDir, '.todowrite');
   const filePath = path.join(dataDir, 'todos.json');

   try {
     await fs.mkdir(dataDir, { recursive: true });

     let existingTodos: Todo[] = [];
     try {
       const fileData = await fs.readFile(filePath, 'utf8');
       existingTodos = JSON.parse(fileData) as Todo[];
     } catch (err) {
       if ((err as any).code !== 'ENOENT') {
         console.error(`Failed to read existing todos from ${filePath}:`, err);
       }
     }

     const newTodos = todos.filter(t => !existingTodos.some(e => e.content === t.content));

     if (newTodos.length === 0) {
       console.log('All extracted todos already exist.');
       return;
     }

     const updatedTodos = [...existingTodos, ...newTodos];
     await fs.writeFile(filePath, JSON.stringify(updatedTodos, null, 2), 'utf8');

     console.log(`Updated ${updatedTodos.length} todo(s) in ${filePath}`);
   } catch (err) {
     console.error('Failed to write todos:', err);
   }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
});