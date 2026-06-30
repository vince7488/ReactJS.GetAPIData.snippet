import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const previewUrl = 'http://127.0.0.1:4173'
const playwrightArgs = process.argv.slice(2)

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  })
}

async function waitForPreview(processRef) {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    if (processRef.exitCode !== null) {
      throw new Error(`Vite preview exited before ${previewUrl} became available.`)
    }

    try {
      const response = await fetch(previewUrl)

      if (response.ok) {
        return
      }
    } catch {
      // Vite is still starting.
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for Vite preview at ${previewUrl}.`)
}

function runPlaywright() {
  return new Promise((resolve) => {
    const playwright = spawnNode(['./node_modules/@playwright/test/cli.js', 'test', ...playwrightArgs], {
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: '1',
      },
    })

    playwright.on('exit', (code) => resolve(code ?? 1))
  })
}

function stopPreview(preview) {
  return new Promise((resolve) => {
    if (preview.exitCode !== null) {
      resolve()
      return
    }

    const killTimer = setTimeout(() => {
      if (preview.exitCode === null) {
        preview.kill('SIGKILL')
      }
    }, 1000)

    preview.once('exit', () => {
      clearTimeout(killTimer)
      resolve()
    })

    preview.kill('SIGTERM')
  })
}

const preview = spawnNode(['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'])

try {
  await waitForPreview(preview)
  const exitCode = await runPlaywright()
  await stopPreview(preview)
  process.exit(exitCode)
} catch (error) {
  console.error(error)
  await stopPreview(preview)
  process.exit(1)
}
