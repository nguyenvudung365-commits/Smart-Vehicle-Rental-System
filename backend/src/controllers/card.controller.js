// src/controllers/card.controller.js
// FR-10: Lien ket the thanh toan
const cardService = require('../services/card.service');
const { ok, created, asyncHandler } = require('../utils/response');

exports.create = asyncHandler(async (req, res) => {
  const card = await cardService.addCard(req.user.id, req.body);
  return created(res, card, 'Da them the');
});

exports.list = asyncHandler(async (req, res) => {
  const cards = await cardService.getMyCards(req.user.id);
  return ok(res, cards);
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await cardService.deleteCard(req.params.id, req.user.id);
  return ok(res, result, 'Da xoa the');
});

exports.setDefault = asyncHandler(async (req, res) => {
  await cardService.setDefault(req.params.id, req.user.id);
  return ok(res, null, 'Da dat lam the mac dinh');
});
