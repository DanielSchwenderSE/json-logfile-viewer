// CLI zum Anlegen, Ändern, Auflisten und Löschen von Benutzerkonten.
//
// Beispiele:
//   npm run create-user -- --username max --password geheim --name "Max Muster" --role admin
//   npm run create-user -- --list
//   npm run create-user -- --delete max
import { userStore, USERS_FILE, type UserRole } from '../users/store.js'

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function run() {
  if (hasFlag('list')) {
    const users = await userStore.list()
    if (users.length === 0) {
      console.log('Keine Benutzer angelegt.')
    } else {
      console.log(`Benutzer (${USERS_FILE}):`)
      for (const u of users) console.log(`  - ${u.username}${u.displayName ? ` (${u.displayName})` : ''} [${u.role}]`)
    }
    return
  }

  const del = getArg('delete')
  if (del) {
    const ok = await userStore.remove(del)
    console.log(ok ? `Benutzer "${del}" gelöscht.` : `Benutzer "${del}" nicht gefunden.`)
    return
  }

  const username = getArg('username')
  const password = getArg('password')
  const name = getArg('name')
  const roleArg = getArg('role')

  if (!username || !password) {
    console.error(
      'Verwendung:\n' +
        '  --username <name> --password <pw> [--name "Anzeigename"] [--role user|admin]   Konto anlegen/ändern\n' +
        '  --list                                                    Konten auflisten\n' +
        '  --delete <name>                                           Konto löschen',
    )
    process.exit(1)
  }

  if (roleArg && roleArg !== 'user' && roleArg !== 'admin') {
    console.error('--role muss "user" oder "admin" sein')
    process.exit(1)
  }
  const role: UserRole = (roleArg as UserRole | undefined) ?? 'user'

  await userStore.upsert(username, password, name, role)
  console.log(`Benutzer "${username}" gespeichert.`)
}

run().catch((err) => {
  console.error('Fehler:', err)
  process.exit(1)
})
