import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BRANDS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Yeezy', 'Asics', 'Crocs', 'Other'];
const CONDITIONS = ['DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR', 'BEAT'];
const SIZE_TYPES = ['US Men', 'US Women', 'US Kids', 'UK', 'EU'];

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    sku: '',
    size: '',
    size_type: 'US Men',
    condition: '',
    price: '',
    description: '',
    trade_intent: 'SALE', // SALE, TRADE, BOTH
    trade_interests: '',
    has_box: true,
    images: [] as string[]
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement actual image upload to S3/CDN
    // For now, using placeholder URL generator
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map(() => 
        `https://placehold.co/600x400/png?text=Sneaker+Image+${formData.images.length + 1}`
      );
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Get location (required for hyperlocal listing)
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await apiClient.createListing({
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        trade_interests: formData.trade_interests ? formData.trade_interests.split(',').map(s => s.trim()) : [],
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        authenticity_photos: [], // Optional
        condition_notes: '',
        has_extras: false,
        visibility: 'PUBLIC'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create listing:', err);
      setError('Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.title && formData.brand && formData.size && formData.condition;
  const isStep2Valid = (formData.trade_intent !== 'TRADE' ? !!formData.price : true) && formData.images.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>List Item for Sale/Trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex gap-2">
            <div className={cn("h-1 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  placeholder="e.g. Jordan 1 Retro High Chicago" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={formData.brand} onValueChange={v => setFormData({...formData, brand: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SKU (Optional)</Label>
                  <Input 
                    placeholder="e.g. 555088-101" 
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Size</Label>
                  <div className="flex gap-2">
                    <Input 
                      className="w-20" 
                      placeholder="10.5" 
                      value={formData.size}
                      onChange={e => setFormData({...formData, size: e.target.value})}
                    />
                    <Select value={formData.size_type} onValueChange={v => setFormData({...formData, size_type: v})}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={formData.condition} onValueChange={v => setFormData({...formData, condition: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-md">
                <Label className="cursor-pointer" htmlFor="has-box">Original Box Included?</Label>
                <Switch 
                  id="has-box"
                  checked={formData.has_box} 
                  onCheckedChange={c => setFormData({...formData, has_box: c})}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
              >
                Next Details
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
              {/* Intent Selector */}
              <div className="grid grid-cols-3 gap-2">
                {['SALE', 'TRADE', 'BOTH'].map((intent) => (
                  <button
                    key={intent}
                    className={cn(
                      "p-2 text-xs font-medium border rounded-md transition-colors",
                      formData.trade_intent === intent 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => setFormData({...formData, trade_intent: intent})}
                  >
                    {intent === 'BOTH' ? 'Sale + Trade' : intent}
                  </button>
                ))}
              </div>

              {formData.trade_intent !== 'TRADE' && (
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              )}

              {formData.trade_intent !== 'SALE' && (
                <div className="space-y-2">
                  <Label>Trade Interests</Label>
                  <Input 
                    placeholder="e.g. Jordan 4s, Travis Scott, Size 11" 
                    value={formData.trade_interests}
                    onChange={e => setFormData({...formData, trade_interests: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Photos ({formData.images.length}/4)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="aspect-square relative rounded-md overflow-hidden border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                        onClick={() => setFormData(prev => ({...prev, images: prev.images.filter((_, idx) => idx !== i)}))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 4 && (
                    <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Any flaws, history, or extra details..." 
                  className="h-20 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={!isStep2Valid || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Create Listing'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
