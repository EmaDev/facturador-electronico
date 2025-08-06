
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';

export default function TemplateEditorPage() {
    const [companyName, setCompanyName] = useState('Invoice Flow Inc.');
    const [footerText, setFooterText] = useState('Thank you for your business! Please make payment within 30 days.');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = () => {
        // In a real application, you would save these settings to a backend or localStorage.
        console.log('Saving changes:', { companyName, footerText, logo: logoPreview });
        // For demonstration, we'll just log it.
        alert('Changes saved successfully! (Check console for details)');
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Edit Invoice Template</CardTitle>
                <CardDescription>Customize the look and feel of your invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                        id="company-name" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company Name"
                    />
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="logo-upload">Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted">
                           {logoPreview ? (
                                <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                           ) : (
                                <span className="text-xs text-muted-foreground">No Logo</span>
                           )}
                        </div>
                        <Button asChild variant="outline">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Logo
                                <Input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoChange} />
                            </label>
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="footer-text">Footer Text</Label>
                    <Textarea 
                        id="footer-text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="e.g., Thank you for your business!"
                        rows={3}
                    />
                </div>

            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </CardFooter>
        </Card>
    );
}
