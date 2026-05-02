const { getMyNotifications, markRead, markAllRead } = require('../services/notification.service');
const { success } = require('../utils/response');

async function list(req, res, next) {
  try {
    const data = await getMyNotifications(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
}

async function readOne(req, res, next) {
  try {
    await markRead(req.params.id, req.user.id);
    success(res, null, 'Đã đánh dấu đã đọc');
  } catch (err) { next(err); }
}

async function readAll(req, res, next) {
  try {
    await markAllRead(req.user.id);
    success(res, null, 'Đã đọc tất cả');
  } catch (err) { next(err); }
}

module.exports = { list, readOne, readAll };
