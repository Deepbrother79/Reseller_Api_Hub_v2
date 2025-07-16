import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: number;
  Title: string | null;
  Content: string | null;
  visible: boolean | null;
  created_at: string;
}

interface NotificationPopupProps {
  forceVisible?: boolean;
  onClose?: () => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ forceVisible = false, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('Notification_Webapp')
        .select('*')
        .eq('visible', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (data && data.length > 0) {
        setNotifications(data);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await supabase
        .from('Notification_Webapp')
        .update({ visible: false })
        .eq('id', notificationId);

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // If no more notifications, hide popup
      if (notifications.length <= 1) {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification_Webapp',
          filter: 'visible=eq.true'
        },
        (payload) => {
          console.log('New notification received:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setIsVisible(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Show popup when forceVisible is true and fetch notifications
  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      fetchNotifications(); // Ricarica le notifiche quando viene aperto manualmente
    }
  }, [forceVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden bg-background border-2 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-foreground">NOTIFICHE</h2>
            <p className="text-sm text-muted-foreground">
              {notifications.length} nuove notifiche
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nessuna notifica disponibile al momento.
            </div>
          ) : (
            notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {notification.Title && (
                    <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">
                      {notification.Title}
                    </h3>
                  )}
                  {notification.Content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notification.Content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-muted rounded-full flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};