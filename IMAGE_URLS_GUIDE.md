# Image URLs Guide for F1-CMS

## How to Add Images

The F1-CMS now supports adding images for drivers and constructors. You can add image URLs when creating or editing drivers and teams.

## Where to Find F1 Images

### Option 1: Use Direct Image URLs
You can use any publicly accessible image URL. Make sure the URL ends with an image extension (.jpg, .png, .webp, etc.)

### Option 2: Free Image Hosting Services
- **Imgur**: https://imgur.com (Upload and get direct link)
- **ImgBB**: https://imgbb.com (Free image hosting)
- **Cloudinary**: https://cloudinary.com (Free tier available)

### Option 3: Official F1 Sources
- Formula1.com official images
- Team official websites
- Wikipedia Commons (free to use)

## Example Image URLs

### Driver Photos (2024 Season)

**Red Bull Racing:**
```
Max Verstappen: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png
Sergio Perez: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png
```

**Ferrari:**
```
Charles Leclerc: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png
Carlos Sainz: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png
```

**Mercedes:**
```
Lewis Hamilton: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png
George Russell: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png
```

**McLaren:**
```
Lando Norris: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png
Oscar Piastri: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png
```

### Constructor Logos

**Team Logos (Transparent PNG recommended):**
```
Red Bull Racing: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/red%20bull.png
Ferrari: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/ferrari.png
Mercedes: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/mercedes.png
McLaren: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/mclaren.png
Aston Martin: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/aston%20martin.png
Alpine: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/alpine.png
Williams: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/williams.png
AlphaTauri: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/alphatauri.png
Alfa Romeo: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/alfa%20romeo.png
Haas: https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/haas.png
```

## How to Add Images in F1-CMS

### Adding Constructor Logo:
1. Go to Championship → Manage Constructors
2. Click "+ Add Constructor" or "Edit" on existing team
3. Fill in Name and Country
4. Paste the logo URL in "Team Logo URL" field
5. Click "Create Constructor" or "Update Constructor"

### Adding Driver Photo:
1. Go to Championship → Manage Drivers
2. Click "+ Add Driver" or "Edit" on existing driver
3. Fill in Name, Nationality, Team, and Number
4. Paste the image URL in "Driver Image URL" field
5. Click "Create Driver" or "Update Driver"

## Image Display

### Driver Standings:
- Driver photos appear as circular avatars (40x40px)
- Red border around the image
- Fallback: First letter of driver name in a circle

### Constructor Standings:
- Team logos appear as rectangular images (48x32px)
- Maintains aspect ratio
- Fallback: First 3 letters of team name

### Management Pages:
- Same display as standings
- Images appear in the table next to names

## Tips for Best Results

1. **Use High-Quality Images**: At least 200x200px for drivers, 300x150px for logos
2. **Transparent Backgrounds**: PNG format works best for team logos
3. **Square Images**: Driver photos look best when square
4. **Test the URL**: Make sure the URL loads in your browser before adding
5. **HTTPS Only**: Use secure URLs (https://) for better compatibility

## Troubleshooting

### Image Not Showing?
- Check if the URL is accessible in your browser
- Make sure the URL is a direct link to an image file
- Verify the URL uses HTTPS
- Check if the image host allows hotlinking

### Image Broken?
- The URL might be expired or moved
- Try uploading to a different image host
- Use the fallback (initials) until you find a working URL

### Image Too Large/Small?
- The system automatically resizes images
- Driver photos: 40x40px circular
- Team logos: 48x32px rectangular

## Alternative: Using Placeholder Services

If you don't have real images, you can use placeholder services:

```
Driver Placeholder: https://ui-avatars.com/api/?name=Max+Verstappen&size=200&background=E10600&color=fff
Team Placeholder: https://via.placeholder.com/300x150/E10600/FFFFFF?text=Red+Bull
```

## Future Enhancements

Planned features:
- Direct file upload (no need for URLs)
- Image cropping tool
- Image gallery
- Automatic image optimization
- CDN integration

---

**Note**: Always respect copyright and licensing when using images. Use official sources or properly licensed images only.
