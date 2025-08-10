import type { Candidate } from './types'
import { randomPortrait } from '../lib/portraits'

const personalities = ['heroic', 'cunning', 'stoic', 'chaotic', 'scholar'] as const
const femaleNames = ['Aria', 'Hana', 'Eira', 'Juno', 'Lyra', 'Mina', 'Nadia', 'Ophelia', 'Rin', 'Sera', 'Talia', 'Yuna']
const maleNames = ['Borin', 'Caius', 'Fynn', 'Garruk', 'Kai', 'Leon', 'Rook', 'Sylas']
const races = ['Human', 'Elf', 'Catfolk', 'Dragonkin']
const hairColors = ['black', 'brown', 'blonde', 'silver', 'red', 'white', 'blue']
const eyeColors = ['brown', 'green', 'blue', 'amber', 'violet', 'gold']
const styles = ['elegant', 'cute', 'athletic', 'mysterious', 'cheerful', 'stoic', 'noble', 'graceful']

function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

export async function generateCandidates(notoriety: number, week: number): Promise<Candidate[]> {
  const classes = [
    { k: 'Warrior', stat: 'str' },
    { k: 'Mage', stat: 'int' },
    { k: 'Rogue', stat: 'agi' },
    { k: 'Cleric', stat: 'spr' },
    { k: 'Ranger', stat: 'agi' },
  ]
  const baseCount = 3 + Math.floor(notoriety / 10)
  const count = Math.min(10, Math.max(3, baseCount))
  const result: Candidate[] = []
  for (let i = 0; i < count; i++) {
    const c = classes[Math.floor(Math.random() * classes.length)]
    const talent = Math.max(1, Math.min(10, 1 + Math.floor(notoriety / 10) + Math.floor(Math.random() * 4) - 1))
    const isFemale = Math.random() < 0.95
    const gender = isFemale ? 'female' : 'male' as const
    const genderIcon = isFemale ? '♀️' : '♂️'
    const race = races[Math.floor(Math.random() * races.length)]
    const hair = hairColors[Math.floor(Math.random() * hairColors.length)]
    const eyes = eyeColors[Math.floor(Math.random() * eyeColors.length)]
    const style = styles[Math.floor(Math.random() * styles.length)]
    const beauty = Math.max(6, Math.min(10, 6 + Math.floor(notoriety / 25) + (Math.floor(Math.random() * 3) - 1)))
    const appearance = `${genderIcon} ${style} ${race.toLowerCase()} with ${hair} hair and ${eyes} eyes; beauty ${beauty}/10`
    const str = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.stat === 'str' ? talent : 0)))
    const int = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.stat === 'int' ? talent : 0)))
    const agi = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.stat === 'agi' ? talent : 0)))
    const spr = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.stat === 'spr' ? talent : 0)))
    const hp = 10 + Math.floor(Math.random() * 11) + talent * 2
    const speed = Math.max(1, Math.min(10, 1 + Math.floor(agi / 3)))
    const upkeep = 5 + Math.floor((str + int + agi + spr) / 6)
    result.push({
      id: uid('cand'),
      name: `${(isFemale ? femaleNames : maleNames)[Math.floor(Math.random() * (isFemale ? femaleNames.length : maleNames.length))]} ${Math.floor(Math.random() * 99) + 1}`,
      class: c.k,
      personality: personalities[Math.floor(Math.random() * personalities.length)],
      gender,
      appearance,
      avatar: randomPortrait(),
      stats: { str, int, agi, spr, hp, speed },
      upkeep,
      skills: [],
      weekAppeared: week,
    })
  }
  return result
}


