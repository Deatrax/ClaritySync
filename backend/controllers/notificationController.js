const supabase = require('../db');

// GET /api/notifications  — current user's notifications
const getMyNotifications = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getMyNotifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
    }
};

// PUT /api/notifications/:id/read  — mark one as read
const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('notification_id', id)
            .eq('user_id', req.user.user_id); // scope to owner

        if (error) throw error;
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('markAsRead error:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

// PUT /api/notifications/read-all  — mark all as read for current user
const markAllRead = async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.user.user_id)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('markAllRead error:', err);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};

module.exports = { getMyNotifications, markAsRead, markAllRead };
