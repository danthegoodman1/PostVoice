export function execShellCommand(cmd: string) {
  const exec = require('child_process').exec
  return new Promise((resolve, reject) => {
    exec(cmd, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        throw error
      }
      // if (stderr) {
      //   reject(stderr)
      // }
      resolve(stdout ? stdout : stderr)
    })
  })
}
