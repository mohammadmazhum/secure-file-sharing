import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import auth from '../middleware/auth.js';
import File from '../models/File.js';
import Share from '../models/Share.js';
import Download from '../models/Download.js';
import { shareStatus } from '../utils/helpers.js';

const r = Router();

r.use(auth);

// ============================================================
// FORMAT SHARE RESPONSE
// ============================================================

const view = (s) => ({
  _id: s._id,

  // IMPORTANT:
  // Send file ID so frontend can connect
  // a share with the correct file.
  fileId: s.file,

  code: s.code,

  fileName: s.fileName,
  fileSize: s.fileSize,

  allowedEmails: s.allowedEmails || [],

  hasPassword: !!s.passwordHash,

  maxDownloads: s.maxDownloads || 0,
  downloadCount: s.downloadCount || 0,

  expiresAt: s.expiresAt,
  createdAt: s.createdAt,

  revokedAt: s.revokedAt,

  status: shareStatus(s),
});

// ============================================================
// ESCAPE SEARCH REGEX
// ============================================================

const esc = (text) =>
  String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============================================================
// CREATE SHARE
// ============================================================

r.post('/', async (req, res) => {
  try {
    const {
      fileId,
      expiresInMinutes,
      password,
      maxDownloads,
    } = req.body || {};

    let { allowedEmails } = req.body || {};

    // --------------------------------------------------------
    // FIND FILE
    // --------------------------------------------------------

    const file = await File.findOne({
      _id: fileId,
      owner: req.user.id,
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found',
      });
    }

    // --------------------------------------------------------
    // EXPIRY VALIDATION
    // --------------------------------------------------------

    const mins = Number(expiresInMinutes);

    if (
      !Number.isFinite(mins) ||
      mins < 1 ||
      mins > 60 * 24 * 90
    ) {
      return res.status(400).json({
        message:
          'Expiry must be between 1 minute and 90 days',
      });
    }

    // --------------------------------------------------------
    // EMAIL VALIDATION
    // --------------------------------------------------------

    if (typeof allowedEmails === 'string') {
      allowedEmails = allowedEmails.split(/[,\s;]+/);
    }

    allowedEmails = [
      ...new Set(
        (allowedEmails || [])
          .map((email) =>
            String(email).trim().toLowerCase()
          )
          .filter(Boolean)
      ),
    ];

    // --------------------------------------------------------
    // DOWNLOAD LIMIT
    // --------------------------------------------------------

    let downloadLimit = 0;

    if (
      maxDownloads !== undefined &&
      maxDownloads !== null &&
      maxDownloads !== ''
    ) {
      downloadLimit = Number(maxDownloads);

      if (
        !Number.isInteger(downloadLimit) ||
        downloadLimit < 0
      ) {
        return res.status(400).json({
          message:
            'Download limit must be 0 or a positive number',
        });
      }
    }

    // --------------------------------------------------------
    // CREATE SHARE
    // --------------------------------------------------------

    const share = await Share.create({
      file: file._id,

      owner: req.user.id,

      fileName: file.originalName,

      fileSize: file.size,

      // Cryptographically secure random code
      code: crypto
        .randomBytes(9)
        .toString('base64url'),

      allowedEmails,

      passwordHash: password
        ? await bcrypt.hash(password, 10)
        : undefined,

      // 0 = unlimited
      maxDownloads: downloadLimit,

      downloadCount: 0,

      expiresAt: new Date(
        Date.now() + mins * 60 * 1000
      ),
    });

    return res.status(201).json({
      share: view(share),
    });
  } catch (error) {
    console.error('Create share error:', error);

    return res.status(500).json({
      message: 'Failed to create share',
    });
  }
});

// ============================================================
// UPDATE EXISTING SHARE
// ============================================================

r.patch('/:id', async (req, res) => {
  try {
    const {
      expiresInMinutes,
      password,
      maxDownloads,
    } = req.body || {};

    let { allowedEmails } = req.body || {};

    // --------------------------------------------------------
    // FIND SHARE OWNED BY CURRENT USER
    // --------------------------------------------------------

    const share = await Share.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!share) {
      return res.status(404).json({
        message: 'Share not found',
      });
    }

    // --------------------------------------------------------
    // DON'T MODIFY REVOKED SHARE
    // --------------------------------------------------------

    if (share.revoked) {
      return res.status(400).json({
        message:
          'This share has already been revoked',
      });
    }

    // --------------------------------------------------------
    // UPDATE EXPIRY
    // --------------------------------------------------------

    if (expiresInMinutes !== undefined) {
      const mins = Number(expiresInMinutes);

      if (
        !Number.isFinite(mins) ||
        mins < 1 ||
        mins > 60 * 24 * 90
      ) {
        return res.status(400).json({
          message:
            'Expiry must be between 1 minute and 90 days',
        });
      }

      share.expiresAt = new Date(
        Date.now() + mins * 60 * 1000
      );
    }

    // --------------------------------------------------------
    // UPDATE ALLOWED EMAILS
    // --------------------------------------------------------

    if (allowedEmails !== undefined) {
      if (typeof allowedEmails === 'string') {
        allowedEmails =
          allowedEmails.split(/[,\s;]+/);
      }

      allowedEmails = [
        ...new Set(
          (allowedEmails || [])
            .map((email) =>
              String(email)
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        ),
      ];

      share.allowedEmails = allowedEmails;
    }

    // --------------------------------------------------------
    // UPDATE PASSWORD
    // --------------------------------------------------------

    if (password !== undefined) {
      if (
        password === null ||
        password === ''
      ) {
        // Remove password protection
        share.passwordHash = undefined;
      } else {
        share.passwordHash =
          await bcrypt.hash(password, 10);
      }
    }

    // --------------------------------------------------------
    // UPDATE DOWNLOAD LIMIT
    // --------------------------------------------------------

    if (maxDownloads !== undefined) {
      const limit = Number(maxDownloads);

      if (
        !Number.isInteger(limit) ||
        limit < 0
      ) {
        return res.status(400).json({
          message:
            'Download limit must be 0 or a positive number',
        });
      }

      // 0 = unlimited
      if (
        limit > 0 &&
        limit < (share.downloadCount || 0)
      ) {
        return res.status(400).json({
          message:
            `Download limit cannot be less than current downloads (${share.downloadCount || 0})`,
        });
      }

      share.maxDownloads = limit;
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    await share.save();

    return res.json({
      message:
        'Share updated successfully',

      share: view(share),
    });
  } catch (error) {
    console.error('Update share error:', error);

    return res.status(500).json({
      message: 'Failed to update share',
    });
  }
});

// ============================================================
// SHARE HISTORY + SEARCH + FILTER
// ============================================================

r.get('/', async (req, res) => {
  try {
    const { q, status } = req.query;

    const filter = {
      owner: req.user.id,
    };

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (q) {
      const rx = new RegExp(
        esc(String(q)),
        'i'
      );

      filter.$or = [
        {
          fileName: rx,
        },
        {
          code: rx,
        },
        {
          allowedEmails: rx,
        },
      ];
    }

    // --------------------------------------------------------
    // GET SHARES
    // --------------------------------------------------------

    let shares = (
      await Share.find(filter)
        .sort('-createdAt')
    ).map(view);

    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    if (status) {
      shares = shares.filter(
        (share) =>
          share.status === status
      );
    }

    return res.json({
      shares,
    });
  } catch (error) {
    console.error(
      'Share history error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to load share history',
    });
  }
});

// ============================================================
// REVOKE SHARE
// ============================================================

r.post('/:id/revoke', async (req, res) => {
  try {
    const share =
      await Share.findOneAndUpdate(
        {
          _id: req.params.id,
          owner: req.user.id,
        },
        {
          revoked: true,
          revokedAt: new Date(),
        },
        {
          new: true,
        }
      );

    if (!share) {
      return res.status(404).json({
        message: 'Share not found',
      });
    }

    return res.json({
      share: view(share),
    });
  } catch (error) {
    console.error(
      'Revoke share error:',
      error
    );

    return res.status(500).json({
      message: 'Failed to revoke share',
    });
  }
});

// ============================================================
// DOWNLOAD LOG
// ============================================================

r.get('/:id/downloads', async (req, res) => {
  try {
    const share = await Share.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!share) {
      return res.status(404).json({
        message: 'Share not found',
      });
    }

    const downloads =
      await Download.find({
        share: share._id,
      })
        .sort('-createdAt')
        .select(
          'userName userEmail ip createdAt'
        );

    return res.json({
      downloads,
    });
  } catch (error) {
    console.error(
      'Download log error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to load download log',
    });
  }
});

export default r;