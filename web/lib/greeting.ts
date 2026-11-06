const GREETINGS = ['Good to see you.', "Let's get applying.", 'Welcome back.', 'Hello again.', 'Hi there.']

// The dashboard heading: a new one each UTC day, picked on the server.
export function greetingFor(date: Date): string {
  return GREETINGS[Math.floor(date.getTime() / 86_400_000) % GREETINGS.length]
}
