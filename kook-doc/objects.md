# 对象模型（常用）

官方文档：https://developer.kookapp.cn/doc/objects

## User

关键字段：`id`、`username`、`nickname`、`identify_num`、`online`、`bot`、`status`、`avatar`、`roles`

## Guild

关键字段：`id`、`name`、`user_id`、`icon`、`notify_type`、`region`、`default_channel_id`、`roles`、`channels`

## Role

关键字段：`role_id`、`name`、`color`、`position`、`mentionable`、`permissions`

## Channel

关键字段：`id`、`name`、`guild_id`、`type`（1文字/2语音）、`is_category`、`parent_id`、`permission_overwrites`

## Quote

关键字段：`id`、`type`、`content`、`create_at`、`author`

## Attachments

关键字段：`type`、`url`、`name`、`size`

