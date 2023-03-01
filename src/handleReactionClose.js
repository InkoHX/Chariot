// @ts-check
import { ChannelType } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 */

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {ForumChannelSetting} setting
 */
export async function handleReactionClose(logger, thread, setting) {
  if (thread.parent?.type !== ChannelType.GuildForum) return

  const starter = await thread.fetchStarterMessage()
  if (!starter) {
    await thread.setArchived()
    logger.info(
      `"${thread.parent.name}" (${thread.parentId}) は最初の投稿が削除されたためクローズします。`
    )
    return
  }

  const [bad, warning] = await Promise.all([
    starter.reactions.resolve('👎')?.fetch(),
    starter.reactions.resolve('⚠️')?.fetch(),
  ])

  // 👎 * 0~2 + ⚠️ * 0 -> なにもしない
  // 👎 * 0~2 + ⚠️ * 1 -> なにもしない
  if (!bad || bad.count < 3) return

  // 👎 * 3~  + ⚠️ * 0 -> ⚠️ つけて 👎 消してclose
  // 👎 * 3~  + ⚠️ * 1 -> ❌ つけてclose
  await Promise.all([
    !warning?.me && bad.remove(),
    starter.react(warning?.me ? '❌' : '⚠️'),
    thread.send(setting[warning?.me ? 'onLock' : 'onClose'](starter.author.id)),
  ])
  await thread[warning?.me ? 'setLocked' : 'setArchived'](
    true,
    `:-1: by ${bad.users.cache
      .map(user => `${user.tag} (${user.id})`)
      .join(', ')}`
  )
  logger.info(
    `"${thread.parent.name}" (${thread.parentId}) は:-1:が${
      warning?.me ? '再度' : ''
    }溜まったためロックします。`
  )
}
