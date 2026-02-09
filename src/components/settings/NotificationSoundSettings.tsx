import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, Volume2, Play } from 'lucide-react';
import { useNotificationSound, NOTIFICATION_SOUNDS } from '@/hooks/useNotificationSound';
import { cn } from '@/lib/utils';

const NotificationSoundSettings: React.FC = () => {
  const {
    soundEnabled,
    selectedSound,
    volume,
    previewSound,
    setSoundEnabled,
    setSelectedSound,
    setVolume,
  } = useNotificationSound();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Sons de Notificação</CardTitle>
            <CardDescription>
              Configure os sons para novas mensagens
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled" className="text-base">Ativar sons</Label>
            <p className="text-sm text-muted-foreground">
              Tocar som quando receber novas mensagens
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>

        {/* Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            value={[volume * 100]}
            onValueChange={([value]) => setVolume(value / 100)}
            max={100}
            step={5}
            disabled={!soundEnabled}
            className="w-full"
          />
        </div>

        {/* Sound Selection */}
        <div className="space-y-3">
          <Label className="text-base">Escolha o som</Label>
          <RadioGroup
            value={selectedSound}
            onValueChange={setSelectedSound}
            disabled={!soundEnabled}
            className="grid gap-2"
          >
            {NOTIFICATION_SOUNDS.map((sound) => (
              <div
                key={sound.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  selectedSound === sound.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  !soundEnabled && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={sound.id} id={sound.id} />
                  <div>
                    <Label
                      htmlFor={sound.id}
                      className="font-medium cursor-pointer"
                    >
                      {sound.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {sound.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewSound(sound.id)}
                  disabled={!soundEnabled}
                  className="h-8 w-8 p-0"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSoundSettings;
